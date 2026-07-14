# ADR 0007: Dashboard read caching — in-process + Next.js, not the query layer

## Status

Accepted — 2026-07-08.

## Context

The dashboard "feels slow to use," worst on the **cold first load** of a guild page. Tracing both read endpoints showed the wall-clock cost is **Discord-REST-bound, not Postgres-bound**:

- `GET /api/guild/:guildId` makes up to **8–9 Discord REST calls** for a legacy guild with a pending handover (channels, roles, bot member, per-channel permission math — plus a duplicate `GET /guilds/:id/channels` in handover eval), each ~150–300ms through the proxy. The 3–4 Postgres queries total ~20–50ms.
- `GET /api/user/guilds` is 1 Discord call + 3 sequential Postgres queries (+ presence-heal Discord checks only when a presence row is absent).
- The web layer had **no caching at all**: every navigation re-fetched cold, and `getUserGuilds()` was called **twice** per guild page (overview page + layout loader).

A query-result cache (e.g. Drizzle's `$withCache`) was the initial idea. It is the wrong tool here on two counts: (1) it caches the backend's own `db.select()` reads, which are <10% of the latency; (2) it cannot serve the bot's hot-path caches (`Channels`, `MigratedGuilds`) — the bot reads Redis directly by explicit key and never runs Drizzle, so a query-hash-keyed cache is unreachable from it. It would delete ~0 lines and move the needle ~0%.

Legacy-guild permission maps were already cached (`LegacyGuildPerms`, Redis DB 7, 5 min) precisely because the roles+member fetch is expensive — a point-solution to the general problem.

## Decision

Diagnose the felt slowness as Discord-REST cost + zero web caching, and fix it in the two layers where the work actually happens. **Do not add a query-result cache; drop the Drizzle-caching idea.**

**Lever A — structural, no new cache (carries the cold load):**

- `getUserGuilds()` wrapped in React `cache()` — request-scoped dedup collapses the double call to one.
- Handover eval receives the already-fetched channel list instead of re-fetching `GET /guilds/:id/channels`.
- Legacy-perms and handover-eval branches run in parallel (both depend only on the prior batch), and the sequential Postgres reads are parallelized/collapsed.

**Lever B — backend in-memory Discord-response cache (helps 2nd view onward + concurrent viewers):**

- A single `cachedGet(route)` helper caches the raw responses of the three per-guild bot-scoped GETs — `/guilds/:id/channels`, `/guilds/:id/roles`, `/guilds/:id/members/:botId` — **keyed by route only, 5-min TTL**. `/channels` and `/roles` are guild-global (Discord returns all channels/roles regardless of the fetching bot's permissions — confirmed in the Discord docs), so a single entry per guild is shared across editions; the free bot's fetch during a pending handover warms the cache for the premium bot's permission eval. `/members/:botId` self-namespaces by `botId`, so editions never collide. Invariants: a miss is fetched via an edition whose bot is **present** in the guild (a non-member gets 404/403), and **only 200 responses are cached** (a stray error must not poison the shared key).
- **In-memory, not Redis.** The backend is a single instance (ADR 0006), and a 5-min TTL cache self-evicts, so it stays small and bounded — putting it in Redis would grow the instance for no benefit. Matches existing backend in-memory caches (`getBotUserId`, presence-heal negative cache, subscriber-username cache).
- The composed endpoint still reads Postgres (channels/filters/subscription) and Redis (handover marker) **live**, so web mutations reflect instantly — only the slow, rarely-changing Discord data is cached.
- **`LegacyGuildPerms` (Redis DB 7) is retired.** Once raw `/roles` + `/members` are cached, recomputing the `canPublish` map is pure in-memory math — the dedicated cache is redundant. One fewer bespoke cache to manage.
- **`/users/@me/guilds` is not cached here** — it is per-user (user OAuth token); the React `cache()` dedup already removes its only waste.

**Web layer — unchanged, no cross-request cache:**

- The originally-planned React `cache()` wrap on `getUserGuilds()` turned out to be a **no-op** and was dropped: the overview page (`/dashboard`) and the guild layout (`/dashboard/[guildId]`) are *separate routes* never rendered in the same request, and within the guild render the layout fetches `getUserGuilds()` and `getGuildDashboard()` once each and shares them via context — so there is no within-request duplicate to dedup. The "double fetch" is across *navigations*, which request-scoped memoization cannot help.
- **No cross-request Next.js Data Cache for the guild payload.** Authorization for `/api/guild/:guildId` is per-user and enforced **in the backend** (`requireGuildPermission` fetches the requester's `/users/@me/guilds` and checks `MANAGE_GUILD`, cached 60s per token); the web's `auth()` only checks that the user is logged in. Caching the composed payload in the shared server-side Data Cache would let a cache hit short-circuit the backend call, serving a guild's data to any logged-in user who navigates to `/dashboard/{guildId}` without the `MANAGE_GUILD` gate ever running — an authorization bypass. So every guild load hits the backend and authorization runs every time.
- Warm navigation is fast **without** a shared web cache: Lever B serves the Discord data from memory, and the backend's existing 60s per-token authz cache means the permission check makes few/no Discord calls. Expected ~50–150ms warm vs. ~600ms today.
- **Instant back-navigation** to an already-opened guild comes from Next.js's **client Router Cache**, enabled with `experimental.staleTimes.dynamic = 60` (default 0 = refetch every navigation). The cache is per-browser (no cross-user exposure), and the mutations' existing `router.refresh()` busts it so edits still reflect immediately; `useRefreshOnReturn` keeps the guild list fresh after an invite. This is deliberately preferred over a **React Query/SWR migration** — that would add true stale-while-revalidate and optimistic UI, but at the cost of converting the server-component→context data flow to client hooks + hydration and rewiring every `useGuild()` consumer and mutation; not worth it for benefits not required.

**Invalidation is TTL-only — no active eviction from Discord permission-change pings.** The single 5-min backend-cache bound is the ceiling on staleness, and only for Discord-derived data (channel list, roles, publish permissions); all DB/Redis-sourced state (enabled channels, filters, subscription, migration, pending) is read live on every request, so dashboard mutations reflect instantly.

## Alternatives considered

- **Drizzle `$withCache` / query-result cache** — targets Postgres reads (<10% of latency) and cannot serve the bot's direct-Redis hot-path caches; deletes no code, fixes nothing felt. Rejected.
- **Cache in Redis instead of in-process** — unnecessary for a single-instance backend and works against the standing goal of keeping Redis from growing; a self-evicting 5-min cache doesn't need cross-process durability. Rejected (revisit only if the backend goes horizontal — correctness holds either way, only hit rate drops).
- **Coarse whole-payload cache** (cache the composed `getGuildDashboard` result, TTL) — simplest, one key, but a TTL over DB-sourced state delays channel/filter mutations by up to the TTL, relocating "slow to use" onto writes. Rejected; the fine-grained split keeps mutations instant.
- **Next.js Data Cache on the composed guild payload** (`revalidateTag` + `revalidate`) — would speed navigation, but the shared server-side cache sits *in front of* the backend's per-user `MANAGE_GUILD` authorization, so a cache hit serves guild data to any logged-in user without the authz check — an authorization bypass. Making it safe requires a per-user authz gate on every request (an authz call per navigation), which erodes the benefit. Rejected in favor of hitting the backend live (authz always enforced) + Lever B for speed; client-side caching is the deferred path to instant navigation.
- **Active eviction on the bot's existing `roleUpdate`/`guildMemberUpdate`/`channelUpdate` pings** — fresher permission data, but every eviction forces the next load to a full Discord refetch; busy guilds (most member/role churn) would evict constantly and pay near-full Discord cost on every load, i.e. it burns the invalid-request budget exactly where it is scarcest. Rejected in favor of the 5-min bound; a *narrowly-targeted* eviction (only the bot's own member/role change) is the documented fallback if 5-min proves too stale.

## Consequences

- Net **fewer Discord REST calls**: Lever A removes the duplicate channel fetch and the double guild-list fetch; Lever B collapses repeat/concurrent loads and pending-handover cross-edition reads to cache hits. This is the primary win and aligns with the standing REST-budget discipline.
- Cold first load drops from ~8–9 serial Discord calls to ~4–5 in two parallel batches; a second view within 5 min and concurrent viewers hit the cache. Navigation still reaches the backend (authorization enforced every time) but is fast (~50–150ms warm) because Discord data is cached and the authz check is 60s-cached per token.
- Redis DB 7 (`LegacyGuildPerms`) and its `services/legacyPerms.ts` cache logic are deleted; the `canPublish` map recomputes from the in-memory Discord cache.
- Staleness contract: everything the user edits in the dashboard (channels, filters, subscription, migration, pending) reflects **immediately** (read live from Postgres/Redis every request); only Discord-derived data (channel list, roles, publish permissions) is up to 5 min stale.
- No shared web-layer cache means no `revalidateTag` wiring to maintain in mutation paths — fewer moving parts. Instant back-navigation is a one-line `staleTimes.dynamic = 60` (client Router Cache, per-browser, busted by the existing `router.refresh()`), not a client-caching library.
- The backend cache is per-process; a future horizontal scale-out lowers hit rate but never correctness.
- Lever B is an explicit opt-in `cachedGet(route)` used only at the guild-dashboard read call sites — **not** a transparent wrapper over `restFor().get()`. Presence-heal's `isBotInGuild` (same `/members/:botId` route) must keep calling live, or a stale cached member would break absence detection.
- The in-memory cache uses a small hand-rolled `createTtlCache<T>()` helper (Map + `expiresAt` lazy expiry + size-gated prune) matching the backend's existing idiom — no new dependency, no LRU cap needed (guild-keyed, 3 small blobs/guild, 5-min TTL, human-driven). The two existing ad-hoc in-memory caches (`discord.ts` `usernameCache`, `presenceHeal.ts` `confirmedAbsentAt`) converge onto the same helper — three bespoke caches become one utility.

## Amendment — 2026-07-13: `/users/@me/guilds` deduped across endpoints

The original decision above assumed the only redundant `/users/@me/guilds` fetch was the web layer's double `getUserGuilds()` (overview + layout), and that it was harmless — the planned React `cache()` dedup was dropped as a no-op (see the "Web layer" note) and the call left uncached.

A second, unguarded redundancy was missed: within a **single guild-page load**, the layout calls `getUserGuilds()` (`GET /api/user/guilds`) **and** `getGuildDashboard()` (`GET /api/guild/:guildId`), and the latter's `requireGuildPermission` middleware makes its **own** `/users/@me/guilds` fetch. These are two separate web→backend requests, so React `cache()` could never have deduped them (the middleware's fetch runs in the backend, out of React's reach). On the rate-limited user OAuth token the middleware's call intermittently 429'd, the middleware mapped any non-200 to `401 "Failed to verify guild membership"`, and the guild layout treated that 401 as "not your guild" → `redirect('/dashboard')`. Next's client Router Cache (`staleTimes.dynamic = 60`) then froze that redirect, so every click bounced back to the server list until a hard refresh — intermittent, since it only surfaced when the redundant call happened to 429.

Fix: `GET /api/user/guilds` now **warms** the same per-token cache key the middleware reads (`discord_guilds:{tokenHash}`, `DiscordAuth` Redis DB, 60s), via the shared `discordGuildsCacheKey()`/`GUILDS_CACHE_TTL_SECONDS` exported from `@ap/express`. Because the layout awaits `getUserGuilds()` before `getGuildDashboard()`, the middleware read-hits the warm entry and skips its Discord call entirely — the cross-endpoint dedup the original ADR assumed existed, now real. Zero added Discord calls; consistent with the standing REST-budget discipline. The middleware's non-200 → 401 mapping is left as-is (unchanged blast radius); it is simply no longer reached in the normal navigation flow.

## Amendment — 2026-07-14: channel-list cache actively evicted on membership change

The original decision (§Decision, "Invalidation is TTL-only") and §Alternatives ("Active eviction on the bot's existing `roleUpdate`/`guildMemberUpdate`/`channelUpdate` pings — rejected") apply to **permission** freshness — roles, bot member, `canPublish` — where eviction is rejected because member/role/overwrite churn is high-frequency in busy guilds and would evict constantly, paying near-full Discord cost on every load exactly where the invalid-request budget is scarcest.

That reasoning does **not** cover a different dimension the ADR conflated into the same 5-min bound: the **channel list itself** (`GET /guilds/:id/channels`) — which channels *exist* and their types. A freshly created announcement channel is invisible in the dashboard for up to 5 min; symmetrically, a deleted or announcement→text-demoted channel lingers as a phantom candidate for up to 5 min. Unlike permission churn, channel-list *membership* changes are rare, and eviction only costs a refetch if someone loads that guild's dashboard within the window.

**Decision:** the `/guilds/:id/channels` cache entry (only) is actively evicted when the bot observes a channel-list membership change — `channelCreate` (announcement), `channelDelete` (announcement), and `channelUpdate` **only when the type crosses the `GuildAnnouncement` boundary** (either direction). The `/roles` and `/members/:botId` entries are untouched: permission freshness stays TTL-only exactly as the original decision rejected.

**Transport:** a dedicated `POST /internal/guild/:guildId/channels/invalidate` → a new exported `Discord.evictGuildChannels(guildId)` (`discordReadCache.delete(Routes.guildChannels(guildId))`). Guild-scoped because eviction must fire even for channels with no registered `channel` row — the existing `DELETE /channel/:channelId` disable path carries only `channelId` and is row-centric, so it can't serve this. `channelUpdate` splits its two concerns: the invalidate fires on the type-cross (either direction) while `syncChannels` + `pingIfPending` stay gated to `isAnnouncement` (relies on the cached `oldChannel.type`; `ChannelManager` is not zeroed).

**Membership, not metadata.** Eviction fires only when the *set* of announcement channels changes — never on rename or reposition, even though channel **names and `position`** (the sidebar-order sort) live in the same cached blob and are therefore ≤5 min stale. A wrong name/order is cosmetic; a missing/phantom channel is a real breakage. Rename/move are also higher-frequency than create/delete/type-cross, so invalidating on them would creep back toward the churn this ADR rejects. Held at membership deliberately.

**Seed on create, no REST fallback.** `channelCreate` also pushes publish-state (`syncChannels(full:false, clearBlocked:false)`) — the bot computes `canPublish` for free from its gateway cache (the `CHANNEL_CREATE` payload carries `permission_overwrites`), so the new channel's first dashboard read hits a warm publish-state entry instead of spending a Discord REST `getCanPublishMap` write-back (ADR 0008). This is a separate call from the invalidate, so it does not re-piggyback eviction onto the permission-sync route.

**Not routed through the permission-sync path.** Eviction is a dedicated, narrow trigger — deliberately **not** folded into `syncChannels` / `POST /internal/channel-permissions/:guildId`, because that endpoint is also called by `guildMemberUpdate` and `roleUpdate`, the high-churn pings §Alternatives refuses to evict on. Piggybacking there would silently re-introduce the rejected behavior.

**Cost is negligible.** The bot already receives these gateway events (`Guilds` intent) whether or not a listener exists; the added work is one channel-type filter (mirrors `channelUpdate.ts`'s existing `type !== GuildAnnouncement` early-return) plus one fire-and-forget backend call per membership change. Announcement-channel churn is a small minority of channel events, itself dwarfed by the `messageCreate` hot path. No measurable REST-budget impact, so the constraint that killed permission-ping eviction is not tripped.

This narrows — does not reverse — the "invalidation is TTL-only" contract: the staleness ceiling for *permission* data stays 5 min; the *channel list* now reflects membership changes within seconds.
