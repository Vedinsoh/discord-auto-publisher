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
bot (Discord Gateway) <--HTTP--> backend (REST API) <--> PostgreSQL (Supabase) + Redis
                  \                       /
                   \                     /
                    --> discord-proxy <--
                         (Discord API)
```

**discord-proxy**:
- Discord API proxy container (@discordjs/proxy-container https://github.com/discordjs/discord.js/tree/main/packages/proxy-container)
- Routes all Discord API requests through centralized proxy
- Runs on port 8080 (internal), exposed on 8081 in dev mode
- Shared by bot, backend and crosspost-worker

**bot** (apps/bot):
- Discord bot app for receiving events and running commands
- Uses Sapphire Framework (https://sapphirejs.dev/docs/General/Welcome) built on discord.js
- Uses discord-hybrid-sharding for horizontal scaling across multiple shards & clusters
- Entry: ClusterManager spawns sharded workers
- Listens for messageCreate in announcement channels
- Validates permissions, detects URLs (5s delay for embed loading)
- **Calls backend as internal API** - bot does NOT make direct Discord API requests for crossposting
- **Routes Discord API requests through discord-proxy** (http://discord-proxy:8080/api)
- Listens for guildDelete/channelDelete for cleanup
- Tech stack: discord.js (https://discord.js.org/docs/packages/discord.js/main & https://discordjs.guide/), Sapphire, discord-hybrid-sharding (https://github.com/meister03/discord-hybrid-sharding/blob/ts-rewrite/README.md)

**backend** (apps/backend):
- **Backend app used as internal API for bot** - central place for sending Discord API requests
- Why centralized: bot has multiple processes (shards/clusters), backend centralizes Discord API calls
- Express REST API (https://expressjs.com/en/4x/api.html) on port 8080
- Manages PostgreSQL persistence (Drizzle ORM + Supabase) & Redis cache (https://redis.io/docs/latest/develop/clients/nodejs/)
- p-queue based crossposting with priority (timestamp-based)
- Two-tier queue: per-channel queues → global queue
- Rate limit management (10/hour per channel Discord limit)
- **Routes Discord API requests through discord-proxy** (http://discord-proxy:8080/api)
- Auto-cleanup on permission/deletion errors
- Cache sync on startup (reconciles Redis/PostgreSQL)
- Tech stack: Express, discord.js, Drizzle ORM (https://orm.drizzle.team), redis, zod (https://v3.zod.dev/)

**Shared packages** (packages/*):
- **@ap/database**: Drizzle ORM schema + client for PostgreSQL (Supabase). Exports `db`, `runMigrations`, and schema table references (`guilds`, `channels`). Migrations in `packages/database/migrations/`.
- **@ap/logger**: Pino logging utilities (REST & Bot loggers)
- **@ap/utils**: Common utilities (time, regex, discord helpers)
- **@ap/validations**: Zod schemas for validation
- **@ap/types**: Shared TypeScript types
- **@ap/tsconfig**: Shared TypeScript configurations

### Key architectural decisions

**HTTP communication between services**: Decouples Discord gateway handling from persistence/queue management. Enables independent scaling of bot shards vs API workers. Allows centralized rate limiting across all shards.

**Two-tier queue system**: Per-channel queues prevent spam channels from monopolizing global queue. Global queue with priority ensures fairness. Older messages prioritized by timestamp.

**Redis channel cache**: Sub-millisecond "is channel enabled" checks. Shared state across multiple services. Built-in TTL for rate limit counters. Startup sync ensures cache/DB consistency.

**5s URL delay**: Discord needs time to generate link previews. Publishing before embeds load causes followers to miss rich content. Uses advanced URL detection algorithm.

**Aggressive Discord cache minimization**: Bot only caches bot member (for permission checks). Reduces memory footprint for high-guild-count scenarios. Uses Intents: Guilds, GuildMessages, MessageContent.

**Rate limit strategy**: Tracks 429 responses in Redis cache. Pauses global queue when >1000 rate limits detected. Resumes when <8000 rate limits AND queue empty. Per-channel counters enforce Discord's 10/hour limit.

**Discord API proxy**: Uses @discordjs/proxy-container to centralize Discord API requests. Provides single point for request management.

**Rollback attempts**: Maintains cache/DB consistency during partial failures. Prevents orphaned cache entries or DB records. Catches & logs rollback failures gracefully.

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
```

**Supabase setup**:
- Local dev: `supabase start` (runs PostgreSQL at `localhost:54322`, credentials `postgres/postgres`)
- Backend Docker containers connect via `DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres`
- Production: cloud Supabase connection string in `DATABASE_URL`
- Config: `supabase/config.toml` (committed, no sensitive data)
- Migrations: `packages/database/migrations/` (committed SQL files, run via `bun run db:migrate`)
- `runMigrations()` is called automatically at backend startup

### Redis structure
- Database 0: Channels cache (`channel:{channelId}` keys)
- Additional databases: Rate limit counters with TTL (1-hour windows)
- Uses SCAN instead of KEYS (production-safe)

### Environment variables
```
NODE_ENV: development|production|test
DISCORD_TOKEN
APP_EDITION: free|premium
BOT_SHARDS
BOT_SHARDS_PER_CLUSTER
DATABASE_URL: postgresql://... (Supabase connection string)
```

## Message publishing flow
1. Discord message posted in announcement channel
2. bot messageCreate listener validates & delays (if URL detected)
3. HTTP POST to crosspost-worker /enqueue/{channelId}/{messageId}
4. crosspost-worker checks channel cache, adds to queue
5. Per-channel queue → global queue (priority by timestamp)
6. Discord crosspost API call with error handling
7. Counter increment, rate limit tracking
8. Auto-cleanup on permission/deletion errors

## Docker configuration
- Base config: scripts/bot/docker-compose.base.yml
- Dev config: scripts/bot/dev/docker-compose.yml (extends base)
- Prod config: scripts/bot/prod/docker-compose.yml
- Service dependencies: bot → discord-proxy, backend → discord-proxy, redis (Redis)
- Health checks on discord-proxy, backend & Redis
- Development: File sync with restart, exposed ports (3000:8080 backend, 8081:8080 proxy, 6379:6379 redis)
- Production: No port exposure, health checks enabled

## Import conventions
- Shared packages: @ap/* (e.g., @ap/database, @ap/logger, @ap/utils)
- Import extensions required: .js for TS files (ES modules)
- Workspace dependencies managed by bun workspaces

## Discord.js specifics
- Version: 14.22.1
- Intents: Guilds, GuildMessages, MessageContent
- Partials: Channel, GuildMember
- Uses discord-hybrid-sharding for horizontal scaling
- Aggressive cache limits (only caches bot member)
- REST API requests routed through @discordjs/proxy-container (discord-proxy service)

## Rate limits & queue management
- Discord limit: 10 crosspost/hour per channel
- Global pause mechanism: >1000 cached rate limits
- Queue cleanup: Inactive channel queues swept every 5 minutes
- Message priority: Older messages published first
- Per-channel queues prevent monopolization
