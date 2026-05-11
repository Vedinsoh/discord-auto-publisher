# Domain language

Concepts that show up across the codebase. Keep this list short — only terms that mean something specific to maintainers, not generic web/Discord terms.

## Crosspost pipeline

- **Crosspost** — Discord's "publish" action on an announcement-channel message. Limited to 10/hour/channel by Discord.
- **Proxy** — single service that owns all Discord REST traffic. Two responsibilities: (1) async crosspost queue with `POST /crosspost/:c/:m` (ACK in <100ms), (2) generic Discord REST passthrough at `/api/*` used by the bot's discord.js. Single `@discordjs/rest` instance shared by both paths; `BurstHandler` lets interactions bypass the crosspost queue naturally.
- **Gate** — synchronous pre-checks the proxy runs before queueing or processing a crosspost. Order: `invalid_requests` (system shed) → `blocked` (cached denylist) → `sublimit` (per-channel 10/hr counter).
- **Sublimit** — Discord's per-channel 10/hour crosspost limit. Mirrored as a Redis counter (`SublimitCounter` DB). Different from a regular route 429.
- **Blocked channel** — a channel where Discord refused crosspost with 401/403 (missing permission, channel deleted). Cached in `BlockedChannels` Redis DB with 1h TTL. Bot can `DELETE /internal/blocked/:c` to clear when permissions are restored.
- **Invalid request budget** — Cloudflare bans an IP after 10k 401/403/non-shared-429s in 10 min. Proxy self-sheds at 5k to stay well under. Tracked in-memory in the proxy (not Redis); counter sourced from `@discordjs/rest`'s `RESTEvents.Response` event, filtered to exclude shared 429s per Discord docs.
- **Passthrough** — proxy's `/api/*` route that forwards generic Discord REST calls on behalf of the bot. Selective header forwarding (`Content-Type`, `x-audit-log-reason`); body forwarded only when `content-length > 0` or `transfer-encoding` is set.

## Allowlist / registration model

- **Registered channel** — a channel a user opted into auto-publishing via `/ap enable`. Persisted in Postgres `channels` table and mirrored in `Channels` Redis cache (`channel:{id}` keys, value = `{filters, filterMode}` JSON, no TTL).
- **Migrated guild** — a guild that has opted into the v7 allowlist model. Marker in `MigratedGuilds` Redis DB (`migrated_guild:{guildId}` = '1', no TTL). Set on first `/ap enable` or new guild join. Migrated guilds enforce the allowlist; legacy (unmigrated) guilds auto-publish all announcement channels. Migration flag is temporary — slated for removal ~6 months after v7 ships.
- **Filter** — premium-only message filter (keyword/mention/author/webhook, allow or block mode) attached to a registered channel. Evaluated bot-side per message before fire-to-proxy. Filter data lives in the `Channels` cache JSON value.

## Services

- **bot** — discord.js gateway listener. Multi-shard via discord-hybrid-sharding. Owns no Discord REST traffic on the hot path (gates everything synchronously, fires-and-forgets to proxy). Does sync permission checks against discord.js cache (never `.fetch()`).
- **backend** — internal Express API. Owns channel registration, filter CRUD, Stripe subscriptions, guild migration markers, the public `/api/*` web surface, and the `Channels` Redis cache.
- **proxy** — see Crosspost pipeline above.
- **web** — Next.js dashboard. Reads from backend's `/api/*`.

## Redis layout (single instance, multiple DBs)

| DB | Name | Owner | Purpose |
|---|---|---|---|
| 0 | `Channels` | backend | registered-channel allowlist + filters |
| 1 | `CrosspostQueue` | proxy | BullMQ |
| 2 | `SublimitCounter` | proxy | per-channel 10/hr crosspost counter, 1h TTL |
| 3 | `BlockedChannels` | proxy | denylist (1h TTL), populated on 401/403 |
| 4 | `DiscordAuth` | backend | web auth token cache |
| 5 | `MigratedGuilds` | backend | v6→v7 allowlist opt-in marker |

## Key architectural rules

- **Bot never `.fetch()`s on the hot path.** `members.me` is auto-populated by `GUILD_CREATE`; trust the cache. Permission checks use `permissionsFor` only.
- **Bot's REST = proxy's REST.** Bot's discord.js is configured with `api: 'http://proxy:8080/api'` and `globalRequestsPerSecond: Infinity` (proxy is the global limiter).
- **Crossposts are never dropped on transient errors.** Route 429s are absorbed by discord.js internally. Sublimit (long waits), global 429s, 5xx, and network errors all become BullMQ delayed retries. Only `already_done`, `blocked`, `sublimit-lock`, and `fatal_4xx` are intentional skips.
- **Single REST instance per token.** One `@discordjs/rest` handles crosspost queue worker and `/api/*` passthrough. Global ceiling is `50/s`; interactions use `BurstHandler` so they don't compete with crossposts.
