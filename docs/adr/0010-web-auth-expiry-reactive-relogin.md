# Web auth expiry: reactive re-login, no refresh-token rotation

The NextAuth session (JWT, rolling `maxAge: 3d`) outlives the embedded Discord OAuth access token (fixed 7d, captured once at sign-in), and nothing reconciled them — so an active user's session stayed alive while its token went stale, and every server-side `backendFetch` 401'd into a generic "Something went wrong" card with no path to recovery (documented in `docs/web-auth-token-expiry.md`). We fix this by treating a backend 401 as "session dead" and transparently re-logging in, and we deliberately do **not** add refresh-token rotation.

## Decision

- `backendFetch` maps any `401` to a dedicated `AuthExpiredError` (safe because every `/api/*` route is behind `createDiscordAuth`, which only 401s on a bad/expired token — `requireGuildPermission` returns 403). The pre-flight no-session / no-token cases throw the same error.
- The error is handled at three seams, anchored on that one error type:
  1. **RSC reads** — the top `dashboard/layout.tsx` (`GuildListLoader`) catches `AuthExpiredError` → renders `<AuthRedirect>`, collapsing token-dead into the same handling as the existing session-missing check. This is the choke point every full load / server navigation passes through.
  2. **Streamed guild-detail promise** — `[guildId]/layout.tsx` streams the promise (does not await it, per ADR 0007), so a thrown error would be sanitized across the RSC→client boundary in prod. A `.catch` maps `AuthExpiredError` to a typed sentinel (`{ authExpired: true }`) the shell reads to render `<AuthRedirect>`. Keeps streaming, dodges error sanitization.
  3. **Server-action mutations** — return `{ ok: false, status }` (`enableChannel`/`migrateGuild` already did; `disableChannel` was converted from throw-on-error, which a sanitized boundary made illegible anyway); a shared client helper (`signInOnAuthExpired`) treats `status === 401` → `signIn('discord', { callbackUrl })`. Two client-invoked, data-returning actions (`createCheckout`, `getSubscription`) still throw rather than return the result shape — both are only reachable after a guild-detail read succeeded in the same render, so their 401 window is seconds and the next navigation's seam 1/2 re-login catches it; not worth reshaping their return types.
- Re-login is the cleanup: `AuthRedirect`'s client `signIn('discord')` round-trips through Discord (no consent prompt — scopes `identify guilds` are unchanged) and NextAuth's `jwt` callback overwrites the dead token with a fresh one. No separate cookie-clearing route is needed.
- Session config (`maxAge: 3d`, rolling) is left untouched — Layer 1 reconciles the lifetime mismatch by construction, and changing `maxAge` would mass-log-out every existing session on deploy.

## Considered and rejected

- **Refresh-token rotation (Layer 2).** Would remove the ~weekly transparent redirect for frequent visitors, but only for users who visit more often than the 7d token lifetime. Cost: Discord rotates the refresh token on every use, and the `jwt` callback runs on every RSC render / server action, so concurrent renders race to spend a single-use token — the losers get `invalid_grant` and would be logged out mid-successful-load. It also stores an indefinitely-refreshable secret in the cookie and adds a synchronous Discord token-endpoint call to the hot path. The benefit removed is a ~1s no-consent redirect; the cost is a latent multi-tab logout race. Rejected as a bad trade. The `AuthExpiredError` seam leaves the door open to add it later. Layer 1 is required regardless — a revoked (not merely expired) grant 401s even with fresh rotation.
- **Two-hop fallback for the streamed promise** (let the guild-detail 401 redirect to the server list, which re-hits seam 1). Rejected: the redirect re-runs `getUserGuilds()`, and the backend auth middleware caches only 200s, so the dead token re-hits `GET /users/@me` — a wasted backend request plus a wasted Discord validation call, against the "be conservative with Discord REST" rule, for an uglier double-bounce.
- **Proactive expiry check** (store `expires_at`, redirect before calling the backend). Rejected: it's the Layer-2 plumbing we cut, and it can't catch revocation, so the reactive 401 path is needed anyway — it would be strictly more code eliminating nothing.
- **Next.js middleware seam.** Impossible: middleware sees only the structurally-valid cookie; only Discord knows the token is dead.

## Amendment (2026-07-21): secondary Discord fetches masked the 401

The decision above assumed "every `/api/*` route only 401s on a dead token, because it's behind `createDiscordAuth`." That held for routes whose only Discord dependency *is* the middleware, but **two routes make a second, in-handler Discord call** the middleware's 401 mapping never sees:

- `GET /api/user/guilds` re-fetches `/users/@me/guilds` (user token) on its **60 s** guild-list cache miss.
- `requireGuildPermission` (guild-detail route) does the same on its own 60 s miss.

`createDiscordAuth`'s validation is cached for **5 min**. So there is a window — auth cache still warm, guild cache already cold — where a dead token is NOT caught by the middleware and instead surfaces on that second fetch. The list route flattened Discord's 401 into a **502**; the middleware over-broadly mapped **all** failures (incl. transient 429/5xx) to **401**. Neither matched the seam-1 contract:

- The 502 was swallowed as a generic error → `GuildListLoader` seeded an empty list → `GuildDashboardShell` saw the guild "missing" and ejected to `/dashboard`, and reactive re-login never fired. This was the reported "refresh after the guild cache expires bounces me off the guild page" bug.
- The over-broad 401 fired a needless full OAuth round-trip on a transient blip.

**Fix (keeps the reactive-only decision; closes the classification gap):**

- Both in-handler fetches split by Discord status: **401 → 401** (re-login), **anything else → 502** (transient, retried in place). `user.ts` `/guilds` and `requireGuildPermission.ts`.
- A **botless** guild-detail read now returns a distinct **409 `BOT_NOT_PRESENT`** (checked from `bot_presence` in Postgres, no Discord call) instead of the generic 500 a downstream Discord 404 produced — so the client can tell *permanent-unavailable* (redirect) from *transient* (retry). `guild.ts` detail route.
- Web: the streamed guild-detail promise now maps to **three** sentinels — `AUTH_EXPIRED` (401), `GUILD_UNAVAILABLE` (403/404/409), `TRANSIENT_ERROR` (5xx/network) — extending the single auth sentinel this ADR introduced (RSC sanitization still forces the sentinel indirection). `useGuild` throws a typed signal per kind; the error boundary gained a `transientFallback` (in-place retry card); `GuildDashboardShell` now distinguishes a *failed* list load (`useGuildList().error` → stay + retry) from a *genuinely-absent* guild (silent redirect to the server list, which owns the invite CTA). Retry is manual (`router.refresh`) — no auto-retry loop against a still-failing upstream.
