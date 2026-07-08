## Documentation

Use Context7 MCP to search documentation for framework/library references instead of fetching URLs directly. Documentation links are included throughout this file for reference.

# Project tech stack

- Monorepo architecture using Turborepo
  - apps in ./apps
  - packages in ./packages - prefixed with "@ap/" when imported in apps
- Docker for containerization
  - Docker container networking for inter-service communication
  - Development & production scripts in ./scripts
- bun runtime & package manager
- TypeScript & ES modules
- Biome.js for linting & formatting

## Common commands

### Development

```bash
bun run dev:start           # Start full dev environment (both editions, Docker Compose)
bun run dev:start:free      # Start one edition only (bot + proxy + backend + redis)
bun run dev:start:premium
bun run dev:watch           # Start with hot reload (--watch); :free / :premium variants too
bun run dev:stop            # Stop everything (down + volumes + Supabase + prune)
bun run dev:stop:free       # Stop only that edition's bot + proxy (backend/redis/Supabase keep running)
bun run dev:stop:premium
bun run dev:logs            # View dev logs
bun run dev:ps              # List dev containers
bun run dev:cache           # Access Redis cache container
```

### Production

```bash
bun run prod:start       # Start production containers
bun run prod:stop        # Stop production containers
bun run prod:logs        # View production logs
bun run prod:ps          # List production containers
```

### Build & Code Quality

```bash
bun run build            # Build all workspace packages
bun run clean            # Clean build artifacts
bun run check-types      # Type check all packages
bun run check            # Lint/format check (Biome)
bun run check:fix        # Lint/format auto-fix
bun run db:generate      # Generate Drizzle SQL migration files
bun run db:migrate       # Apply pending migrations to database
```

### Supabase (local dev)

```bash
supabase start           # Start local Supabase (PostgreSQL on localhost:54322)
supabase stop            # Stop local Supabase
supabase status          # Show local Supabase status and connection info
```

## Architecture overview

### Multi-service design

One stack: per-edition bots + proxies, a single edition-agnostic backend, one Postgres, one Redis (ADR 0006).

```
bot-free ────► proxy-free ─────┐            ┌──> PostgreSQL (Supabase)
    │              ▲           │ Discord    │
    │              │ /api/*    │ REST       ├──> Redis (shared instance,
    ├──HTTP──► backend (single, edition-agnostic)   per-edition proxy DBs)
    │              │ /api/*    │
    │              ▼           │
bot-premium ─► proxy-premium ──┘
(bots POST /crosspost/:c/:m to their own edition's proxy)
```

**proxy** (apps/proxy, one instance per edition):

- Discord REST gateway + async crosspost queue for its edition's bot token. Replaces the old `@discordjs/proxy-container` + `crosspost-worker` pair.
- Two responsibilities:
  - `POST /crosspost/:channelId/:messageId` — sync gate check, then BullMQ enqueue. ACKs 202 in <100ms.
  - `*/api/*` passthrough — generic Discord REST proxy used by its bot + the backend's per-edition `@discordjs/rest`. Selective header forwarding, response streamed back.
- Single `@discordjs/rest` instance shared by both paths. Interaction acks bypass crosspost queue naturally via `BurstHandler`.
- Per-edition Redis DBs via `ProxyDatabaseIDs` in `@ap/redis` (free: 1/2/3, premium: 9/10/11 for queue/sublimit/blocked).
- Egress IP pinning: `config.egressLocalAddress` (from `EGRESS_LOCAL_ADDRESS_FREE`/`_PREMIUM`) sets an undici `Agent({ connect: { localAddress } })` so each edition keeps its own source IP (per-edition Cloudflare ban isolation). Unset = default route (dev).
- Sync pre-check pipeline (gate): `invalid_requests` shed → `BlockedChannels` denylist → `SublimitCounter` (per-channel 10/hr).
- BullMQ worker (concurrency 50) classifies Discord error outcomes:
  - `already_done` / `blocked` / `sublimit` (intentional skip + cache update)
  - `transient_429` / `global_ratelimit` → `job.moveToDelayed` with `Retry-After`
  - `5xx` / network → BullMQ exponential backoff (10 attempts)
- Cloudflare-ban self-shed at 5,000 invalid requests / 10 min (half of Discord's 10k ceiling). Tracked in-memory via `RESTEvents.Response`, excluding shared 429s.
- Runs on port 8080 (internal); dev exposes proxy-free on 8081, proxy-premium on 8082. Healthcheck on `/health`. Stats on `/info`.
- Tech stack: `@discordjs/rest`, BullMQ + ioredis (queue), Express, undici (egress pinning), pino via `@ap/logger`.

**bot** (apps/bot, one instance per edition — keeps `APP_EDITION` + its own token via `config.discordToken`):

- Discord bot app for receiving events and running commands
- Uses Sapphire Framework (https://sapphirejs.dev/docs/General/Welcome) built on discord.js
- Uses discord-hybrid-sharding for horizontal scaling across multiple shards & clusters; `ClusterManager` does manual exponential-backoff respawn (5s/30s/60s/5min/10min) to avoid burning the invalid-request budget.
- Entry: `ClusterManager` spawns sharded workers via `lib/shard.ts`.
- Listens for `messageCreate` in announcement channels. **Hot path is fully synchronous + cache-only**:
  1. `isCrosspostable` bit-flag check (system, IsCrosspost, Crossposted)
  2. `canCrosspostInChannel` — sync `permissionsFor(members.me)` (never `.fetch()`)
  3. `Handover.isActive(guildId)` — premium only: in-memory latch once active; `PremiumPending` Redis check per message only while a handover is pending (free bot: unconditionally true)
  4. `Guild.isMigrated(guildId)` Redis lookup; if migrated → `Channel.isEnabled(channelId)` Redis lookup (else bail)
  5. `Filter.evaluate` (premium-only HTTP to backend)
  6. 5s delay if URL without embed (lets Discord generate embeds)
  7. `Data.API.Proxy.enqueueCrosspost(channelId, messageId)` — raw `fetch` POST, fire-and-forget
- Permission listeners (`channelUpdate`, `guildMemberUpdate`, `roleUpdate`) call `DELETE /internal/blocked/:c` on the proxy to invalidate the denylist when perms are restored; on the premium bot they additionally ping `POST /internal/handover/:guildId/evaluate` while the guild is pending.
- Guild lifecycle calls to the backend carry the bot's edition (`POST /guild/:id/new` and `DELETE /guild/:id` body `{edition}`); the backend owns all join/leave decisions — there is no bot-side subscription check. Lifecycle calls retry transient failures (network/5xx, 3 attempts); all backend calls log non-ok responses (`data/api/backend.ts`).
- **Discord REST routed through its edition's proxy `/api/*`** (`config.proxyUrl`, `globalRequestsPerSecond: Infinity` — proxy is the global limiter).
- Listens for guildDelete/channelDelete for cleanup (guildDelete also clears the handover latch)
- Tech stack: discord.js (https://discord.js.org/docs/packages/discord.js/main & https://discordjs.guide/), Sapphire, discord-hybrid-sharding (https://github.com/meister03/discord-hybrid-sharding/blob/ts-rewrite/README.md)

**backend** (apps/backend, single instance, edition-agnostic — no `APP_EDITION`, Paddle always on):

- **Internal API for both bots + web dashboard API** — owns channel registration, filters, Paddle subscriptions, per-edition bot presence, the premium entitlement gate, and handover orchestration.
- Express REST API (https://expressjs.com/en/4x/api.html) on port 8080
- Manages PostgreSQL persistence (Drizzle ORM + Supabase) & Redis caches: `Channels` (allowlist + filters), `MigratedGuilds` (v6→v7 migration markers, derived from `guild.migratedAt`), `DiscordAuth` (web auth tokens), `PaddleWebhookDedupe` (webhook idempotency keys), `LegacyGuildPerms` (legacy-guild `canPublish` maps, 5 min TTL), `PremiumPending` (handover markers).
- Cache sync on startup (reconciles Redis/Postgres).
- **Two `@discordjs/rest` clients** (`Discord.restFor(edition)`, tokens `DISCORD_TOKEN_FREE`/`_PREMIUM`), each routed through its edition's proxy (`PROXY_URL_FREE`/`_PREMIUM`); callers pick by managing edition (`Editions.getManagingEdition`).
- Join orchestration in `Guilds.registerNewGuild(guildId, edition, channels)`: premium not entitled → leave via premium proxy; premium joining while free active → `PremiumPending` marker + immediate handover evaluation; free joining while premium manages → leave via free proxy.
- Handover machinery (`services/handover.ts`): marker CRUD, blocked-channel evaluation (premium bot's effective permissions over registered channels — legacy guilds: all announcement channels — via `services/botPermissions.ts`), swap executor (DEL marker → free-bot leave, alert on leave failure). Re-evaluated on premium join, bot permission pings, and dashboard loads.
- Paddle (merchant of record) integration for premium subscriptions: backend-created transactions for the web overlay checkout, Customer Portal sessions, `POST /webhooks/paddle` (signature-verified, Redis-deduped), daily reconcile cron against the Paddle API. Postgres is the subscription source of truth; entitled statuses are `active`/`trialing`/`past_due`.
- Crons: guild presence reconcile (`30 3 * * *` — one sweep per edition over `bot_presence` via that edition's proxy, then dangling-marker sweep + purge; also runs once at startup; manual trigger `POST /internal/reconcile/guilds`) and subscription reconcile (`0 4 * * *`; also runs once at startup after the guild reconcile so its bot-present backstop reads fresh presence; manual trigger `POST /internal/reconcile/subscriptions`).
- Presence self-heal on dashboard reads (`services/presenceHeal.ts`, wired into `GET /api/user/guilds` + `GET /api/guild/:guildId`): DB says an edition absent → live `isBotInGuild` check via its proxy → restore row with reconcile-sweep semantics (legacy insert + shared `services/joinRails.ts`, never a leave on a missing subscription row); 30s in-memory negative cache. Exists because re-authorizing an already-present bot fires NO gateway event.
- Per-guild channel limit by managing edition (`Editions.resolveChannelLimit`: premium 0 = unlimited, free 3), enforced against the bot actually publishing — the free bot never serves >3 even for an entitled guild whose premium bot hasn't taken over. It returns `{ limit, reason }`; on a cap hit the `reason` (`LIMIT_FREE` / `LIMIT_PREMIUM_INVITE` / `LIMIT_PREMIUM_PENDING`) rides the 400 error `code` (via `createHttpError`/`sendErrorResponse`) so the bot (`ap/enable`) and dashboard (`ChannelLimitModal`, migrate modal) show buy-Premium vs. invite-bot vs. grant-permissions instead of one generic error. Used at both `Channels.add` and `Guilds.migrate`.
- Tech stack: Express, `@discordjs/rest`, Drizzle ORM (https://orm.drizzle.team), ioredis via `@ap/redis`, zod (https://v3.zod.dev/), @paddle/paddle-node-sdk (https://developer.paddle.com/)

**Shared packages** (packages/\*):

- **@ap/database**: Drizzle ORM schema + client for PostgreSQL (Supabase). Exports `db`, `runMigrations`, and schema table references (`guild`, `botPresence`, `channel`, `subscription`, `paddleCustomer`). Migrations in `packages/database/migrations/`.
- **@ap/logger**: Pino logging utilities (REST & Bot loggers)
- **@ap/alerts**: `createAlerter` — fire-and-forget Discord webhook alerts (`ALERT_WEBHOOK_URL`, disabled when unset), per-key throttle via `Alerts` Redis DB (30 min TTL), minimal embed format. Wired events: duplicate entitled subscription (backend), guild reconcile rails tripped (backend), invalid-request shed (proxy). Bar for new events: actionable, not merely unusual.
- **@ap/utils**: Common utilities (time, regex, discord helpers)
- **@ap/validations**: Zod schemas for validation
- **@ap/types**: Shared TypeScript types
- **@ap/tsconfig**: Shared TypeScript configurations

### Key architectural decisions

**Single backend, per-edition bots + proxies** (ADR 0006): one edition-agnostic backend, one Postgres, one Redis; only bots and proxies are per-edition (separate tokens, gateway connections, BullMQ queues, egress IPs). Fixes the broken upgrade funnel (checkout used to route to a backend that 404'd billing), config loss on edition switches, and doubled `GET /users/@me/guilds` calls.

**Premium handover = gated atomic swap** (ADR 0006): bot permissions don't transfer between Discord apps, so when the premium bot joins a guild the free bot covers, the premium bot idles behind a `PremiumPending` Redis marker while the free bot operates unchanged. The backend evaluates the premium bot's effective permissions across registered channels (on join + permission-change pings); when all pass it deletes the marker (premium hot path latches "active" on its first absent read) and has the free bot leave — no publishing gap, worst case seconds of double coverage (loser classifies `already_done`). Edge rules: free kicked mid-pending → premium activates immediately; free re-invited while premium manages → backend makes it leave again; premium kicked mid-pending → marker cleared, free continues. Pending may last indefinitely (dashboard banner nags).

**Backend-side entitlement gate**: `registerNewGuild(guildId, 'premium', …)` checks the subscription table; not entitled → backend has the premium bot leave via the premium proxy. No bot-side subscription check. The reconcile sweeps re-run the join rails for guilds whose `guildCreate` was missed.

**Proxy service per edition**: each `apps/proxy` instance owns all Discord REST traffic for one token — the async crosspost queue and the generic `/api/*` passthrough — sharing a single `@discordjs/rest` instance. Replaces the previous `discord-proxy` (generic container) + `crosspost-worker` (custom in-memory queue) pair. Production pins each proxy's outbound source IP (`EGRESS_LOCAL_ADDRESS_*`) for Cloudflare ban isolation.

**BullMQ-backed queue**: Jobs survive proxy restarts. `jobId: ${channelId}-${messageId}` prevents duplicate enqueues. Per-outcome handling: only intentional skips (`already_done` / `blocked` / `sublimit-lock`) drop messages; transient errors become delayed retries (≤5 min cap) or BullMQ exponential backoff (10 attempts).

**Wait when Discord asks**: `Retry-After` from rate-limit responses is honoured exactly via `job.moveToDelayed`. Never drops messages on transient 429s.

**Cloudflare-ban self-shed**: Proxy tracks 401/403/(non-shared)429 responses in-memory; at 5k in 10 min (half of Discord's 10k ceiling) the gate rejects new crossposts with 503 `Retry-After: 60` so the host IP can't get banned. Counter is filtered via `RESTEvents.Response` + `X-RateLimit-Scope` (the library's `InvalidRequestWarning` is incorrect — it counts sublimit hits).

**Allowlist + migration model**: Premium-relevant channels are explicitly registered via `/ap enable` or the dashboard migrate flow. Migration state lives in `guild.migratedAt` (Postgres, `NULL` = legacy); the `MigratedGuilds` Redis cache is derived from it (rebuilt at startup) — migrated guilds enforce the allowlist; legacy guilds auto-publish all announcement channels. `Guilds.migrate` is DB-first: one transaction (channel rows + `migratedAt`), then derived cache sync with the Redis marker written last (behavioral commit point — every partial state stays fully legacy, no compensating rollbacks). Slated for removal ~6 months after v7 ships (`migratedAt` + Redis DBs 5/7 + legacy web UX dropped together). See ADR 0005.

**Bot presence + soft delete**: A `bot_presence` row (pk `(guildId, edition)`) with `leftAt IS NULL` means "this edition's bot is in the guild" (drives dashboard `freeBotPresent`/`premiumBotPresent` and the premium revocation backstop) — NOT "guild is migrated"; legacy guilds get rows too. Kick/leave soft-deletes the presence (config + cache preserved for re-invite; any pending handover marker is cleared); re-invite (`guildCreate` → `registerNewGuild`) reactivates the presence, prunes config for channels deleted while no bot was watching (live list from the GUILD_CREATE payload), and rebuilds the derived Redis state (entries first, marker last); the reconciliation cron (daily 03:30 + once at backend startup) runs one sweep per edition (insert missed guilds as legacy + presence, restore/soft-delete by diffing that bot's guild list — rails: abort on pagination error, 1h join-race guard on `joinedAt`, `max(50, 10%)` deletion cap), then — only when BOTH sweeps completed — re-runs the join rails on the reconciled rows for inserted/restored + dual-presence guilds (premium leaves only on an existing not-entitled subscription row, never on a missing one — post-DB-reset the subscription reconcile owns revocation; missing marker for dual-presence guilds is restored; free leaves only after a live premium-membership check), sweeps handover markers (clears dangling ones, re-evaluates valid ones so stalled handovers complete within a day), and hard-purges guilds whose newest `leftAt` is >30 days old with no active presence (`Guilds.purge`, cutoff-guarded so a mid-sweep re-invite wins). Dashboard reads self-heal missing presences (live membership check + restore via the shared join rails in `services/joinRails.ts`) — Discord fires no event when an already-present bot is re-authorized, so a lost row is otherwise invisible until the nightly sweep. Presence + reconciliation are permanent. See ADR 0005 + 0006.

**Redis channel cache**: Sub-ms "is channel enabled" Redis lookups on bot's hot path (no backend RTT). Startup sync reconciles cache/DB consistency.

**5s URL delay**: Discord needs time to generate link previews. Publishing before embeds load causes followers to miss rich content.

**Aggressive Discord cache minimization**: Bot only caches bot member (for permission checks). Reduces memory footprint for high-guild-count scenarios. Uses Intents: Guilds, GuildMessages, MessageContent.

**Cluster respawn backoff**: `ClusterManager` disables native auto-respawn and schedules respawn with exponential backoff (5s/30s/60s/5min/10min, reset after 10 min of stability). Prevents a death-loop from burning the invalid-request budget.

### Database schema (Drizzle ORM + PostgreSQL)

```
guild {
  guildId (text, pk — natural key; Discord snowflakes are immutable, never reused)
  migratedAt (timestamp, NULL = legacy guild; dropped at sunset)
  createdAt, updatedAt
}

bot_presence {
  guildId (text, FK → guild.guildId, cascade delete)
  edition (text, check 'free'|'premium')
  joinedAt (timestamp, not null — reconcile join-race guard keys off it)
  leftAt (timestamp, NULL = bot in guild; soft delete, guild purged 30d after newest leftAt)
  pk (guildId, edition)
}

channel {
  channelId (text, pk — natural key)
  guildId (text, FK → guilds.guildId, cascade delete)
  filters (jsonb, array of ChannelFilter)
  filterMode (text, default 'any')
  createdAt, updatedAt
}

subscription {
  id (uuid, pk — surrogate kept deliberately: two candidate keys; a guild_id PK would bake in "one subscription row per guild forever")
  guildId (text, unique — intentionally NO FK: subscription outlives the guild row)
  paddleSubscriptionId (text, unique)
  paddleCustomerId (text)
  subscriberDiscordUserId (text)
  status (text, Paddle statuses verbatim: 'active', 'trialing', 'past_due', 'paused', 'canceled')
  paddlePriceId (text)
  billingInterval (text: 'month' | 'year')
  currentPeriodEndsAt, scheduledChangeAction, scheduledChangeAt, canceledAt, createdAt, updatedAt
}
```

**Supabase setup**:

- Local dev: `supabase start` (runs PostgreSQL at `localhost:54322`, credentials `postgres/postgres`)
- Backend Docker containers connect via `DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres`
- Production: cloud Supabase connection string in `DATABASE_URL`
- Config: `supabase/config.toml` (committed, no sensitive data)
- Migrations: `packages/database/migrations/` (committed SQL files, run via `bun run db:migrate`)
- `runMigrations()` is called automatically at backend startup

### Redis structure

Single Redis instance, multiple logical DBs (managed via `DatabaseIDs` enum in `@ap/redis`):

| DB | Name | Owner | Purpose |
|----|------|-------|---------|
| 0 | `Channels` | backend | registered-channel allowlist + filters (no TTL) |
| 1 | `CrosspostQueue` | free proxy | BullMQ |
| 2 | `SublimitCounter` | free proxy | per-channel 10/hr counter (`channel:sublimit:{id}`, 1h TTL) |
| 3 | `BlockedChannels` | free proxy | denylist (`channel:blocked:{id}`, 1h TTL) — populated on 401/403 |
| 4 | `DiscordAuth` | backend | web auth token cache |
| 5 | `MigratedGuilds` | backend | v6→v7 migration markers (`migrated_guild:{id}`, no TTL), derived from `guild.migratedAt` |
| 6 | `PaddleWebhookDedupe` | backend | Paddle webhook idempotency (`paddle_event:{eventId}`, 24h TTL) |
| 7 | `LegacyGuildPerms` | backend | legacy-guild `canPublish` maps (`legacy_perms:{guildId}`, 5 min TTL); dropped at sunset |
| 8 | `Alerts` | shared | alert-webhook per-key throttle markers (`alert:{key}`, 30 min TTL) via `@ap/alerts` |
| 9 | `CrosspostQueuePremium` | premium proxy | BullMQ |
| 10 | `SublimitCounterPremium` | premium proxy | per-channel 10/hr counter (1h TTL) |
| 11 | `BlockedChannelsPremium` | premium proxy | denylist (1h TTL) |
| 12 | `PremiumPending` | backend (premium bot reads) | handover markers (`premium_pending:{guildId}`, no TTL) |

Proxies resolve their DB triple via `ProxyDatabaseIDs[edition]` in `@ap/redis`. Uses SCAN instead of KEYS (production-safe). ioredis client (BullMQ requirement), wrapped by `@ap/redis` factory `createRedisClient(databaseId)`.

### Environment variables

One shared `.env` for the whole stack. Bots/proxies resolve their token, proxy URL, and egress IP from `APP_EDITION` (set per compose service) via `config.discordToken` / `config.proxyUrl` / `config.egressLocalAddress`. There are deliberately NO singular `DISCORD_TOKEN`/`PROXY_URL` overrides — a stale v6-era env file must not silently make both editions share one Discord app.

```
NODE_ENV: development|production|test
APP_EDITION: free|premium (bot + proxy only; set per compose service)
DISCORD_TOKEN_FREE / DISCORD_TOKEN_PREMIUM: per-edition bot tokens
PROXY_URL_FREE / PROXY_URL_PREMIUM: per-edition proxy base URLs (default compose service names)
EGRESS_LOCAL_ADDRESS_FREE / EGRESS_LOCAL_ADDRESS_PREMIUM: proxy outbound source IPs (prod; empty = default route)
BOT_SHARDS
BOT_SHARDS_PER_CLUSTER
DATABASE_URL: postgresql://... (Supabase connection string)
REDIS_URI: redis://redis:6379 (optional override; defaults to shared Docker Redis)
ALERT_WEBHOOK_URL: Discord webhook for ops alerts (optional; alerts disabled when unset)
PADDLE_ENVIRONMENT: sandbox|production (backend)
PADDLE_API_KEY: Paddle API key (backend)
PADDLE_WEBHOOK_SECRET: Paddle notification destination secret (backend)
PADDLE_PRICE_MONTHLY: Paddle Price ID for monthly plan (pri_...)
PADDLE_PRICE_YEARLY: Paddle Price ID for yearly plan (pri_...)
BACKEND_URL: single backend base URL (web, server-only)
NEXT_PUBLIC_PADDLE_ENVIRONMENT: sandbox|production (web)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: Paddle client-side token for Paddle.js (web)
```

## Message publishing flow

1. Discord message posted in announcement channel; bot's `messageCreate` listener fires.
2. Bot synchronously gates: `isCrosspostable` bit-flags → `canCrosspostInChannel` (cache-only `permissionsFor`) → `Handover.isActive` (premium latch; Redis only while pending) → `Guild.isMigrated` Redis → `Channel.isEnabled` Redis → `Filter.evaluate` (premium-only, HTTP to backend).
3. 5s delay if message has URL but no embeds.
4. Bot `fetch` POSTs `{its proxy}/crosspost/:channelId/:messageId` (fire-and-forget, 5s timeout).
5. Proxy re-runs sync gate (invalid-requests → blocked → sublimit). Rejects with 503 / 204 or accepts with 202.
6. Proxy enqueues a BullMQ job (its edition's queue DB) keyed by `${channelId}-${messageId}`.
7. Worker (concurrency 50) re-evaluates gate, calls `rest.post(Routes.channelMessageCrosspost(...))`, classifies result via `classifier.ts`.
8. Success → increment `SublimitCounter`. Errors → cache update + skip (intentional) or `moveToDelayed` (transient) or BullMQ retry (5xx).

## Docker configuration

- Base config: `scripts/bot/docker-compose.base.yml`
- Dev config: `scripts/bot/dev/docker-compose.yml` (extends base)
- Prod config: `scripts/bot/prod/docker-compose.yml`
- Services: `proxy-free`, `proxy-premium`, `bot-free`, `bot-premium`, `backend`, `redis` (one stack; `APP_EDITION` set per service)
- Service dependencies: bot-{edition} → proxy-{edition} + backend + redis; backend → redis; proxy-{edition} → redis
- Health checks on proxies, backend & redis
- Development: File sync with restart, exposed ports (3101:8080 backend, 8081:8080 proxy-free, 8082:8080 proxy-premium, 6379:6379 redis); any subset can be started (`docker compose ... up backend` alone is enough for web/checkout work; `bot-free` pulls in its proxy + backend + redis)
- Production: No port exposure, health checks enabled

## Import conventions

- Shared packages: `@ap/*` (e.g., `@ap/database`, `@ap/logger`, `@ap/utils`, `@ap/redis`, `@ap/config`)
- Import extensions required: `.js` for TS files (ES modules)
- Workspace dependencies managed by bun workspaces

## Discord.js specifics

- Version: 14.x
- Intents: Guilds, GuildMessages, MessageContent
- Partials: Channel, GuildMember
- Uses discord-hybrid-sharding for horizontal scaling
- Aggressive cache limits (only caches bot member; never `.fetch()` on hot path)
- REST API routed through this edition's proxy `/api/*` (`config.proxyUrl`); `globalRequestsPerSecond: Infinity` (proxy is the global limiter)

## Rate limits & queue management

- Discord limit: 10 crosspost/hour per channel (`SublimitCounter` Redis DB)
- Cloudflare 10k invalid-requests/10min: proxy self-sheds at 5k threshold (in-memory tracker)
- BullMQ queue: 10 attempts with exponential backoff (2s base), `Retry-After` honoured via `moveToDelayed` (≤5 min cap), high-water mark 10k waiting jobs → 503 `Retry-After: 30`
- Single `@discordjs/rest` instance; `BurstHandler` lets interaction acks bypass crosspost queueing
