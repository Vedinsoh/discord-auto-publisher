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
bun run dev:start        # Start dev environment (Docker Compose)
bun run dev:watch        # Start with hot reload (--watch)
bun run dev:stop         # Stop dev containers
bun run dev:logs         # View dev logs
bun run dev:ps           # List dev containers
bun run dev:cache        # Access Redis cache container
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

```
bot (Discord Gateway) ──HTTP──> backend (REST API) ──> PostgreSQL (Supabase) + Redis
        │                            │
        │  POST /crosspost/:c/:m     │  HTTP /api/* (passthrough)
        └────────────►  proxy  ◄─────┘
                  (Discord API + BullMQ crosspost queue)
```

**proxy** (apps/proxy):

- Single Discord REST gateway + async crosspost queue. Replaces the old `@discordjs/proxy-container` + `crosspost-worker` pair.
- Two responsibilities:
  - `POST /crosspost/:channelId/:messageId` — sync gate check, then BullMQ enqueue. ACKs 202 in <100ms.
  - `*/api/*` passthrough — generic Discord REST proxy used by bot + backend's `@discordjs/rest`. Selective header forwarding, response streamed back.
- Single `@discordjs/rest` instance shared by both paths. Interaction acks bypass crosspost queue naturally via `BurstHandler`.
- Sync pre-check pipeline (gate): `invalid_requests` shed → `BlockedChannels` denylist → `SublimitCounter` (per-channel 10/hr).
- BullMQ worker (concurrency 50) classifies Discord error outcomes:
  - `already_done` / `blocked` / `sublimit` (intentional skip + cache update)
  - `transient_429` / `global_ratelimit` → `job.moveToDelayed` with `Retry-After`
  - `5xx` / network → BullMQ exponential backoff (10 attempts)
- Cloudflare-ban self-shed at 5,000 invalid requests / 10 min (half of Discord's 10k ceiling). Tracked in-memory via `RESTEvents.Response`, excluding shared 429s.
- Runs on port 8080 (internal), exposed on 8081 in dev. Healthcheck on `/health`. Stats on `/info`.
- Tech stack: `@discordjs/rest`, BullMQ + ioredis (queue), Express, pino via `@ap/logger`.

**bot** (apps/bot):

- Discord bot app for receiving events and running commands
- Uses Sapphire Framework (https://sapphirejs.dev/docs/General/Welcome) built on discord.js
- Uses discord-hybrid-sharding for horizontal scaling across multiple shards & clusters; `ClusterManager` does manual exponential-backoff respawn (5s/30s/60s/5min/10min) to avoid burning the invalid-request budget.
- Entry: `ClusterManager` spawns sharded workers via `lib/shard.ts`.
- Listens for `messageCreate` in announcement channels. **Hot path is fully synchronous + cache-only**:
  1. `isCrosspostable` bit-flag check (system, IsCrosspost, Crossposted)
  2. `canCrosspostInChannel` — sync `permissionsFor(members.me)` (never `.fetch()`)
  3. `Guild.isMigrated(guildId)` Redis lookup; if migrated → `Channel.isEnabled(channelId)` Redis lookup (else bail)
  4. `Filter.evaluate` (premium-only HTTP to backend)
  5. 5s delay if URL without embed (lets Discord generate embeds)
  6. `Data.API.Proxy.enqueueCrosspost(channelId, messageId)` — raw `fetch` POST, fire-and-forget
- Permission listeners (`channelUpdate`, `guildMemberUpdate`, `roleUpdate`) call `DELETE /internal/blocked/:c` on the proxy to invalidate the denylist when perms are restored.
- **Discord REST routed through proxy `/api/*`** (`http://proxy:8080/api`, `globalRequestsPerSecond: Infinity` — proxy is the global limiter).
- Listens for guildDelete/channelDelete for cleanup
- Tech stack: discord.js (https://discord.js.org/docs/packages/discord.js/main & https://discordjs.guide/), Sapphire, discord-hybrid-sharding (https://github.com/meister03/discord-hybrid-sharding/blob/ts-rewrite/README.md)

**backend** (apps/backend):

- **Internal API for bot** — owns channel registration, filters, Paddle subscriptions, web dashboard API.
- Express REST API (https://expressjs.com/en/4x/api.html) on port 8080
- Manages PostgreSQL persistence (Drizzle ORM + Supabase) & Redis caches: `Channels` (allowlist + filters), `MigratedGuilds` (v6→v7 migration markers), `DiscordAuth` (web auth tokens), `PaddleWebhookDedupe` (webhook idempotency keys).
- Cache sync on startup (reconciles Redis/Postgres).
- **Discord REST routed through proxy `/api/*`** for guild-channel reads and entitlement revocation (premium bot leaves guilds that lose their subscription).
- Paddle (merchant of record) integration for premium subscriptions: backend-created transactions for the web overlay checkout, Customer Portal sessions, `POST /webhooks/paddle` (signature-verified, Redis-deduped), daily reconcile cron against the Paddle API. Postgres is the subscription source of truth; entitled statuses are `active`/`trialing`/`past_due`.
- Tech stack: Express, `@discordjs/rest`, Drizzle ORM (https://orm.drizzle.team), ioredis via `@ap/redis`, zod (https://v3.zod.dev/), @paddle/paddle-node-sdk (https://developer.paddle.com/)

**Shared packages** (packages/\*):

- **@ap/database**: Drizzle ORM schema + client for PostgreSQL (Supabase). Exports `db`, `runMigrations`, and schema table references (`guilds`, `channels`). Migrations in `packages/database/migrations/`.
- **@ap/logger**: Pino logging utilities (REST & Bot loggers)
- **@ap/utils**: Common utilities (time, regex, discord helpers)
- **@ap/validations**: Zod schemas for validation
- **@ap/types**: Shared TypeScript types
- **@ap/tsconfig**: Shared TypeScript configurations

### Key architectural decisions

**Single proxy service**: One `apps/proxy` owns all Discord REST traffic — both the async crosspost queue and the generic `/api/*` passthrough — sharing a single `@discordjs/rest` instance. Replaces the previous `discord-proxy` (generic container) + `crosspost-worker` (custom in-memory queue) pair.

**BullMQ-backed queue**: Jobs survive proxy restarts. `jobId: ${channelId}-${messageId}` prevents duplicate enqueues. Per-outcome handling: only intentional skips (`already_done` / `blocked` / `sublimit-lock`) drop messages; transient errors become delayed retries (≤5 min cap) or BullMQ exponential backoff (10 attempts).

**Wait when Discord asks**: `Retry-After` from rate-limit responses is honoured exactly via `job.moveToDelayed`. Never drops messages on transient 429s.

**Cloudflare-ban self-shed**: Proxy tracks 401/403/(non-shared)429 responses in-memory; at 5k in 10 min (half of Discord's 10k ceiling) the gate rejects new crossposts with 503 `Retry-After: 60` so the host IP can't get banned. Counter is filtered via `RESTEvents.Response` + `X-RateLimit-Scope` (the library's `InvalidRequestWarning` is incorrect — it counts sublimit hits).

**Allowlist + migration model**: Premium-relevant channels are explicitly registered via `/ap enable`. `MigratedGuilds` Redis cache marks guilds opted into the v7 model — migrated guilds enforce the allowlist; legacy guilds auto-publish all announcement channels. Slated for removal ~6 months after v7 ships.

**Redis channel cache**: Sub-ms "is channel enabled" Redis lookups on bot's hot path (no backend RTT). Startup sync reconciles cache/DB consistency.

**5s URL delay**: Discord needs time to generate link previews. Publishing before embeds load causes followers to miss rich content.

**Aggressive Discord cache minimization**: Bot only caches bot member (for permission checks). Reduces memory footprint for high-guild-count scenarios. Uses Intents: Guilds, GuildMessages, MessageContent.

**Cluster respawn backoff**: `ClusterManager` disables native auto-respawn and schedules respawn with exponential backoff (5s/30s/60s/5min/10min, reset after 10 min of stability). Prevents a death-loop from burning the invalid-request budget.

### Database schema (Drizzle ORM + PostgreSQL)

```
guilds {
  id (uuid, pk)
  guildId (text, unique)
  createdAt, updatedAt
}

channels {
  id (uuid, pk)
  channelId (text, unique)
  guildId (text, FK → guilds.guildId, cascade delete)
  filters (jsonb, array of ChannelFilter)
  filterMode (text, default 'any')
  createdAt, updatedAt
}

subscription {
  id (uuid, pk)
  guildId (text, unique — intentionally NO FK: subscription outlives the guild row)
  paddleSubscriptionId (text, unique)
  paddleCustomerId (text)
  subscriberDiscordUserId (text)
  status (text, Paddle statuses verbatim: 'active', 'trialing', 'past_due', 'paused', 'canceled')
  paddlePriceId (text)
  billingInterval (text: 'month' | 'year')
  currentPeriodEndsAt, scheduledChangeAction, scheduledChangeAt, canceledAt, createdAt, updatedAt
}

paddle_customer {
  id (uuid, pk)
  discordUserId (text, unique)
  paddleCustomerId (text, unique)
  email (text)
  createdAt, updatedAt
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
| 1 | `CrosspostQueue` | proxy | BullMQ |
| 2 | `SublimitCounter` | proxy | per-channel 10/hr counter (`channel:sublimit:{id}`, 1h TTL) |
| 3 | `BlockedChannels` | proxy | denylist (`channel:blocked:{id}`, 1h TTL) — populated on 401/403 |
| 4 | `DiscordAuth` | backend | web auth token cache |
| 5 | `MigratedGuilds` | backend | v6→v7 migration markers (`migrated_guild:{id}`, no TTL) |
| 6 | `PaddleWebhookDedupe` | backend | Paddle webhook idempotency (`paddle_event:{eventId}`, 24h TTL) |

Uses SCAN instead of KEYS (production-safe). ioredis client (BullMQ requirement), wrapped by `@ap/redis` factory `createRedisClient(databaseId)`.

### Environment variables

```
NODE_ENV: development|production|test
DISCORD_TOKEN
APP_EDITION: free|premium
BOT_SHARDS
BOT_SHARDS_PER_CLUSTER
DATABASE_URL: postgresql://... (Supabase connection string)
REDIS_URI: redis://redis:6379 (optional override; defaults to shared Docker Redis)
PADDLE_ENVIRONMENT: sandbox|production (premium backend only)
PADDLE_API_KEY: Paddle API key (premium backend only)
PADDLE_WEBHOOK_SECRET: Paddle notification destination secret (premium backend only)
PADDLE_PRICE_MONTHLY: Paddle Price ID for monthly plan (pri_...)
PADDLE_PRICE_YEARLY: Paddle Price ID for yearly plan (pri_...)
NEXT_PUBLIC_PADDLE_ENVIRONMENT: sandbox|production (web)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: Paddle client-side token for Paddle.js (web)
```

## Message publishing flow

1. Discord message posted in announcement channel; bot's `messageCreate` listener fires.
2. Bot synchronously gates: `isCrosspostable` bit-flags → `canCrosspostInChannel` (cache-only `permissionsFor`) → `Guild.isMigrated` Redis → `Channel.isEnabled` Redis → `Filter.evaluate` (premium-only, HTTP to backend).
3. 5s delay if message has URL but no embeds.
4. Bot `fetch` POSTs `http://proxy:8080/crosspost/:channelId/:messageId` (fire-and-forget, 5s timeout).
5. Proxy re-runs sync gate (invalid-requests → blocked → sublimit). Rejects with 503 / 204 or accepts with 202.
6. Proxy enqueues a BullMQ job (DB 1) keyed by `${channelId}-${messageId}`.
7. Worker (concurrency 50) re-evaluates gate, calls `rest.post(Routes.channelMessageCrosspost(...))`, classifies result via `classifier.ts`.
8. Success → increment `SublimitCounter`. Errors → cache update + skip (intentional) or `moveToDelayed` (transient) or BullMQ retry (5xx).

## Docker configuration

- Base config: `scripts/bot/docker-compose.base.yml`
- Dev config: `scripts/bot/dev/docker-compose.yml` (extends base)
- Prod config: `scripts/bot/prod/docker-compose.yml`
- Services: `proxy`, `bot`, `backend`, `redis`
- Service dependencies: bot → proxy + backend + redis; backend → proxy + redis; proxy → redis
- Health checks on proxy, backend & redis
- Development: File sync with restart, exposed ports (3101:8080 backend, 8081:8080 proxy, 6379:6379 redis)
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
- REST API routed through `apps/proxy` `/api/*`; `globalRequestsPerSecond: Infinity` (proxy is the global limiter)

## Rate limits & queue management

- Discord limit: 10 crosspost/hour per channel (`SublimitCounter` Redis DB)
- Cloudflare 10k invalid-requests/10min: proxy self-sheds at 5k threshold (in-memory tracker)
- BullMQ queue: 10 attempts with exponential backoff (2s base), `Retry-After` honoured via `moveToDelayed` (≤5 min cap), high-water mark 10k waiting jobs → 503 `Retry-After: 30`
- Single `@discordjs/rest` instance; `BurstHandler` lets interaction acks bypass crosspost queueing
