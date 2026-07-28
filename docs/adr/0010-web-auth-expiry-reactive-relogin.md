# Web auth expiry & resilient user-token Discord reads

The NextAuth session (JWT, rolling `maxAge: 3d`) outlives the embedded Discord OAuth access token (fixed 7d, captured once at sign-in), and nothing reconciled them — so an active user's session stayed alive while its token went stale, and every server-side `backendFetch` 401'd into a generic "Something went wrong" card with no path to recovery (documented in `docs/web-auth-token-expiry.md`). We treat a backend 401 as "session dead" and transparently re-log-in, and we deliberately do **not** add refresh-token rotation.

The auth layer's Discord dependency also has to be *resilient*, not just *classified*: `discordAuth` (`GET /users/@me`) and `requireGuildPermission` / the `/api/user/guilds` route (`GET /users/@me/guilds`) read the **user's OAuth token direct to discord.com — not through the bot proxy** — so `@discordjs/rest`'s retry/rate-limit handling never touches them. A single transient Discord 429/5xx on a cache miss would otherwise surface as a user-facing "temporarily unavailable" card or a spurious full re-login. These are all user-token reads, so none of this touches the bot's Cloudflare invalid-request budget.

## Decision

### Reactive re-login (the auth-expiry seam)

- `backendFetch` maps any `401` to a dedicated `AuthExpiredError` (safe because every `/api/*` route is behind `createDiscordAuth`, which only 401s on a genuinely bad/expired token — `requireGuildPermission` returns 403). The pre-flight no-session / no-token cases throw the same error.
- The error is handled at three seams, anchored on that one error type:
  1. **RSC reads** — the top `dashboard/layout.tsx` (`GuildListLoader`) catches `AuthExpiredError` → renders `<AuthRedirect>`, collapsing token-dead into the same handling as the existing session-missing check. This is the choke point every full load / server navigation passes through.
  2. **Streamed guild-detail promise** — `[guildId]/layout.tsx` streams the promise (does not await it, per ADR 0007), so a thrown error would be sanitized across the RSC→client boundary in prod. A `.catch` maps it to a typed sentinel the shell reads. Keeps streaming, dodges error sanitization.
  3. **Server-action mutations** — return `{ ok: false, status }` (`enableChannel`/`migrateGuild`/`disableChannel`); a shared client helper (`signInOnAuthExpired`) treats `status === 401` → `signIn('discord', { callbackUrl })`. Two client-invoked, data-returning actions (`createCheckout`, `getSubscription`) still throw rather than return the result shape — both are only reachable after a guild-detail read succeeded in the same render, so their 401 window is seconds and the next navigation's seam 1/2 catches it; not worth reshaping their return types.
- Re-login is the cleanup: `AuthRedirect`'s client `signIn('discord')` round-trips through Discord (no consent prompt — scopes `identify guilds` are unchanged) and NextAuth's `jwt` callback overwrites the dead token with a fresh one. No separate cookie-clearing route is needed.
- Session config (`maxAge: 3d`, rolling) is left untouched — seam 1 reconciles the lifetime mismatch by construction, and changing `maxAge` would mass-log-out every existing session on deploy.

### One resilient path for all user-token Discord reads

`createDiscordAuth`'s validation is cached 5 min but the guild list only 60 s, so there is a window — auth cache warm, guild cache cold — where a dead token is not caught by the middleware and instead surfaces on a second, in-handler Discord fetch. That fetch, plus the two others, used to be three copy-pasted raw `fetch()` calls with no retry, no `Retry-After` handling, and divergent error mapping (the list route flattened Discord's 401 into a 502; `discordAuth` mapped *all* non-ok — including transient 429/5xx — to 401). Backend logs confirmed the intermittent "Guild detail temporarily unavailable" reports were these transient 502s, mostly on `/api/user/guilds`, spread evenly (ordinary blips, not one outage).

All three now call **one shared helper** — `packages/express/src/discordUserApi.ts` (`fetchUserGuilds` / `fetchDiscordUser`):

- **Fresh cache → bounded retry → last-known-good.** Read the existing per-token cache key (unchanged TTLs: 60 s guilds / 5 min auth); on miss, fetch with ≤3 attempts honouring a short `Retry-After` and backing off on 5xx / network / header-less-429; on success write both the fresh key and a longer-lived `…:lkg` copy (only 200s cached, so an error never poisons either); on exhausted transient serve LKG if present (an invisible, warn-logged stale-serve) else return transient.
- **Correct classification.** A genuine Discord `401` short-circuits with no retry and no stale-serve, so reactive re-login still fires; everything else transient → `502` only when there's no LKG to absorb it.
- **Stale-serve is a deliberate, bounded fail-open.** Because these are authorization gates (`requireGuildPermission` MANAGE_GUILD, `discordAuth` identity), serving LKG on a transient error keeps a *just-revoked* user authorized until the stale entry lapses. Failing closed instead *is* the 502 card this removes (the middleware runs on the guild-detail route), so LKG-on-authz is required to fix the bug; the mitigation is to **cap the window — LKG TTL is 10 min, not an hour** — matching the ~5-10 min permission-staleness the dashboard already tolerates (ADR 0007). `fetchDiscordUser` also **narrows** the cached payload to `{id, username, avatar, email}` rather than persisting the full raw `/users/@me` PII for the LKG window.
- Web `backendFetch` bounds **reads** with a 10 s `AbortSignal.timeout`, so a hung upstream (e.g. a stalled DB connection) aborts into the same transient/auto-retry path instead of an indefinite loading skeleton. Mutations are left untimed — aborting a non-idempotent write that may have committed would surface a spurious failure and prompt a duplicate.

### Failure taxonomy on the guild-detail read

The streamed guild-detail promise maps to **three** sentinels the client acts on distinctly:

- `AUTH_EXPIRED` (401) → `<AuthRedirect>` re-login (the seam-2 case above).
- `GUILD_UNAVAILABLE` (403 / 404 / **409 `BOT_NOT_PRESENT`**) → permanent-unavailable. A botless guild returns a distinct **409** checked from `bot_presence` in Postgres (no Discord call), so the client tells permanent-absent from transient. `GuildDashboardShell` distinguishes a *failed* list load (`useGuildList().error` → stay + retry) from a *genuinely-absent* guild (silent redirect to the server list, which owns the invite CTA).
- `TRANSIENT_ERROR` (5xx / network) → the error boundary's `transientFallback` in-place retry card. Retry is manual (`router.refresh`) — no auto-retry loop against a still-failing upstream.

`useGuild` throws a typed signal per kind; RSC sanitization is why the sentinel indirection exists rather than throwing the errors directly.

## Considered and rejected

- **Refresh-token rotation (Layer 2).** Would remove the ~weekly transparent redirect for frequent visitors, but only for users who visit more often than the 7d token lifetime. Cost: Discord rotates the refresh token on every use, and the `jwt` callback runs on every RSC render / server action, so concurrent renders race to spend a single-use token — the losers get `invalid_grant` and would be logged out mid-successful-load. It also stores an indefinitely-refreshable secret in the cookie and adds a synchronous Discord token-endpoint call to the hot path. The benefit removed is a ~1s no-consent redirect; the cost is a latent multi-tab logout race. Rejected as a bad trade. The `AuthExpiredError` seam leaves the door open to add it later. Reactive re-login is required regardless — a revoked (not merely expired) grant 401s even with fresh rotation.
- **Two-hop fallback for the streamed promise** (let the guild-detail 401 redirect to the server list, which re-hits seam 1). Rejected: the redirect re-runs `getUserGuilds()`, and the backend auth cache stores only 200s, so the dead token re-hits `GET /users/@me` — a wasted backend request plus a wasted Discord validation call, against the "be conservative with Discord REST" rule, for an uglier double-bounce.
- **Proactive expiry check** (store `expires_at`, redirect before calling the backend). Rejected: it's the Layer-2 plumbing we cut, and it can't catch revocation, so the reactive 401 path is needed anyway — it would be strictly more code eliminating nothing.
- **Next.js middleware seam.** Impossible: middleware sees only the structurally-valid cookie; only Discord knows the token is dead.
- **Composed-payload last-known-good on `GET /api/guild/:guildId`.** Not supported by the logs — the transient 502 is thrown in the auth layer *before* the composed handler runs, so a payload-LKG would fix none of the observed failures. The handler's own bot-token Discord reads are already shielded by `discord.ts`'s last-known-good (ADR 0007), a separate layer.
