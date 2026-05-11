# Proxy + Bot crosspost pipeline — migration plan for `refactor/v7`

This document captures the working architecture from this branch (`refactor/proxy`) and provides a step-by-step recipe to port it to `refactor/v7`. The goal: a proxy service that ACKs crossposts in <100ms, processes them via a Redis-backed BullMQ queue, never drops messages on transient rate limits, and prevents Cloudflare bans by self-shedding.

---

## 1. Architecture summary

```
┌──────────────────────┐       HTTP POST            ┌──────────────────────────────────┐
│  Bot (12 shards)     │ ─────────────────────────▶ │  Proxy (single instance)         │
│                      │  /crosspost/:c/:m          │                                  │
│ - synchronous perm   │                            │ ┌────────────────────────────┐   │
│   check (cache only) │ ◀───────── 202 Accepted ── │ │ Express HTTP layer         │   │
│ - filters non-       │   in <100ms                │ │ ├─ /health                 │   │
│   crosspostable msgs │                            │ │ ├─ /info                   │   │
│ - fires & forgets    │                            │ │ ├─ /crosspost/:c/:m POST   │   │
└──────────────────────┘                            │ │ ├─ /internal/blocked/:c    │   │
        │                                           │ │ │   DELETE                 │   │
        │ DELETE /internal/blocked/:c               │ │ └─ /api/* (passthrough)    │   │
        │ on permission events                      │ └────────┬───────────────────┘   │
        ▼                                           │          │                       │
                                                    │          ▼                       │
                                                    │  ┌──────────────────────────┐    │
                                                    │  │ Gate (sync pre-checks)   │    │
                                                    │  │  - invalid_requests shed │    │
                                                    │  │  - blocked channel cache │    │
                                                    │  │  - sublimit counter      │    │
                                                    │  └──────────────┬───────────┘    │
                                                    │                 │                │
                                                    │                 ▼                │
                                                    │  ┌──────────────────────────┐    │
                                                    │  │ BullMQ queue (Redis DB 0)│    │
                                                    │  │  jobId: ${c}-${m}        │    │
                                                    │  │  attempts: 10            │    │
                                                    │  │  exp backoff             │    │
                                                    │  └──────────────┬───────────┘    │
                                                    │                 │                │
                                                    │                 ▼                │
                                                    │  ┌──────────────────────────┐    │
                                                    │  │ Worker (concurrency 50)  │    │
                                                    │  │  - re-evaluate gate      │    │
                                                    │  │  - call REST             │    │
                                                    │  │  - classify outcome      │    │
                                                    │  │  - lock / cache / retry  │    │
                                                    │  └──────────────┬───────────┘    │
                                                    │                 │                │
                                                    │                 ▼                │
                                                    │  ┌──────────────────────────┐    │
                                                    │  │ @discordjs/rest (50/s    │    │
                                                    │  │  global, BurstHandler    │    │
                                                    │  │  for interactions)       │    │
                                                    │  └──────────────┬───────────┘    │
                                                    └─────────────────┼────────────────┘
                                                                      │
                                                                      ▼
                                                                 Discord API
```

### Core principles enforced by this design

- **No unintentional skips.** Transient 429 (route bucket, global) → BullMQ delayed retry (up to 5 min cap). 5xx / network → exponential backoff retry (up to 10 attempts).
- **Wait when Discord asks.** Use response `Retry-After` exactly via `job.moveToDelayed(now + retryAfter, job.token)`.
- **Persistence.** BullMQ jobs survive proxy restarts.
- **Single REST instance.** One `@discordjs/rest` covers crossposts AND non-crosspost passthrough. Interaction acks naturally bypass crosspost queue via `BurstHandler`.
- **CF-ban prevention.** Self-shed at 5,000 invalid requests / 10 min (half of Discord's 10k ceiling). Counter sourced from `@discordjs/rest`'s built-in `InvalidRequestWarning` event.
- **Bot is a thin event source.** It does sync permission checks against discord.js cache and fires-and-forgets to the proxy. Never makes Discord API calls per message.

---

## 2. v7 starting state

`refactor/v7` already has:

- A `discord-proxy` service (generic discord.js REST proxy without queue/gate logic).
- A `crosspost-worker` service that uses `@discordjs/rest` pointed at `discord-proxy` and contains the in-memory queue/handler logic from older iterations.
- Bot at `apps/bot/src/` with `services/crosspost.ts` and `services/channel.ts`.
- Bot's REST configured to route through `discord-proxy`.

This migration **consolidates `discord-proxy` + `crosspost-worker` into a single `proxy` service** with the architecture above, and updates the bot to use the new flow.

---

## 3. Final file layout

### Proxy (`apps/proxy/` — rename from `apps/discord-proxy/`)

```
apps/proxy/
├── package.json                              # deps: @discordjs/rest, bullmq, ioredis,
│                                             #       redis, express, discord-api-types,
│                                             #       envalid, dotenv, pino
├── tsconfig.json
├── Dockerfile
├── Dockerfile.dev
└── src/
    ├── index.ts                              # main(): wires deps, starts Express + worker
    ├── config.ts                             # envalid: REDIS_URI, DISCORD_TOKEN, PORT,
    │                                         # REDIS_TIMEOUT_MS=500
    ├── logger.ts                             # pino
    │
    ├── http/
    │   ├── app.ts                            # Express app factory; routes mounted here
    │   ├── health.ts                         # GET /health → 200 OK
    │   └── info.ts                           # GET /info → REST stats + queue stats +
    │                                         # cache sizes + invalid_requests
    │
    ├── crosspost/
    │   ├── index.ts                          # barrel
    │   ├── caches.ts                         # SublimitCounter + BlockedCache (Redis)
    │   ├── classifier.ts                     # error → CrosspostOutcome union
    │   ├── gate.ts                           # invalid_requests + blocked + sublimit pre-checks
    │   └── queue.ts                          # BullMQ Queue + Worker + Express routers
    │
    ├── gateway/
    │   ├── index.ts                          # buildGateway(): rest + invalidRequests + router
    │   ├── rest.ts                           # createRest(): @discordjs/rest with
    │   │                                     # rejectOnRateLimit predicate
    │   ├── invalidRequests.ts                # invalid-request tracker (Response event,
    │   │                                     # excludes shared 429s)
    │   └── passthrough.ts                    # generic discord.js REST passthrough
    │                                         # (slash commands, etc.)
    │
    └── redis/
        ├── index.ts                          # barrel
        └── client.ts                         # createRedisClient(databaseId) factory
                                              # + disconnectAllRedis()
```

### Bot (`apps/bot/src/`)

```
apps/bot/src/
├── data/api/
│   └── proxy.ts                              # enqueueCrosspost, clearBlocked, getInfo
│                                             # (replaces crosspost-worker.ts)
│
├── services/
│   ├── crosspost.ts                          # isCrosspostable + handle (sync perm check)
│   ├── permissions.ts                        # canCrosspostInChannel + refreshChannel
│   └── info.ts                               # types match new /info response
│
├── listeners/
│   ├── permissions/                          # NEW dir for cant-post invalidation
│   │   ├── channelUpdate.ts                  # refresh on permission overwrite changes
│   │   ├── guildMemberUpdate.ts              # refresh on bot's role changes
│   │   └── roleUpdate.ts                     # refresh on held-role permission changes
│   └── ...
│
└── shard.ts                                  # rest: { api: 'http://proxy:8080/api',
                                              #         globalRequestsPerSecond: Infinity,
                                              #         timeout: 60_000 }
```

### Infrastructure (`docker-compose*.yml`, `.env.example`)

- Rename `discord-proxy` service → `proxy`. Drop `crosspost-worker` entirely.
- Bot env: `PROXY_URL=http://proxy:8080` (or hardcoded in bot).
- Shared Redis service used for: BullMQ (DB 0), sublimit counter (DB 1), blocked cache (DB 2).

---

## 4. Migration steps

Execute in order. Each step is independently testable.

### Step 1 — Drop `crosspost-worker`, rename `discord-proxy` → `proxy`

```sh
git mv apps/discord-proxy apps/proxy
git rm -r apps/crosspost-worker
```

Update `docker-compose*.yml`: remove `crosspost-worker` service, rename `discord-proxy` → `proxy`. Update any references in `apps/bot` (`http://discord-proxy:8080` → `http://proxy:8080`).

Update `apps/proxy/package.json` `name` field from `discord-proxy` to `proxy`. If the monorepo uses workspaces / turbo, update those configs too.

### Step 2 — Add proxy dependencies

In `apps/proxy/package.json`:

```json
{
  "dependencies": {
    "@discordjs/rest": "^2.4.0",
    "bullmq": "^5.13.0",
    "discord-api-types": "^0.37.110",
    "dotenv": "^16.4.5",
    "envalid": "^8.0.0",
    "express": "^5.1.0",
    "ioredis": "^5.4.1",
    "pino": "^9.5.0",
    "redis": "^4.7.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "pino-pretty": "^11.2.2",
    "tsx": "^4.19.0",
    "typescript": "^5.5.4"
  }
}
```

Run `npm install` (or workspace equivalent).

### Step 3 — Build the proxy modules

Implement these files in order. Each is short (< 200 lines); copy verbatim from `services/proxy/src/` on `refactor/proxy` branch.

**3.1 `src/config.ts`** — envalid env loader with `REDIS_URI`, `DISCORD_TOKEN`, `PORT=8080`, `REDIS_TIMEOUT_MS=500`.

**3.2 `src/logger.ts`** — pino logger configured at `LOGGER_LEVEL` env, with `service: 'proxy'` base field.

**3.3 `src/redis/client.ts`** — factory: `createRedisClient(databaseId: number): Promise<RedisClient>`. Maintains module-level array of created clients for `disconnectAllRedis()`.

**3.4 `src/crosspost/caches.ts`** — two Redis-backed modules:

- `SublimitCounter`:
  - Key: `channel:sublimit:{channelId}`, TTL 1h.
  - `isOverLimit(channelId)` → count ≥ 10 (with 500ms timeout, fails open to false).
  - `increment(channelId)` → atomic `MULTI` of `INCR` + `EXPIRE NX 3600`.
  - `lock(channelId, retryAfterSec)` → `SETEX key, ttl, "10"`.
  - `size()` → `dbSize()`.
- `BlockedCache`:
  - Key: `channel:blocked:{channelId}`, TTL 1h.
  - `isBlocked(channelId)` → returns true if value === '1'.
  - `set/clear/size`.
- Shared `withTimeout(promise, fallback, ctx)` helper that returns `fallback` on `REDIS_TIMEOUT_MS`. **Always fail open** for read paths (don't drop crossposts on Redis blip).

**3.5 `src/crosspost/classifier.ts`** — pure function:

```ts
type CrosspostOutcome =
  | { kind: 'already_done' }
  | { kind: 'blocked'; status: 401 | 403 }
  | { kind: 'sublimit'; retryAfterMs: number }
  | { kind: 'global_ratelimit'; retryAfterMs: number }
  | { kind: 'transient_429'; retryAfterMs: number }
  | { kind: 'fatal_4xx'; status: number; code: number | string }
  | { kind: 'retryable_5xx'; status: number };

export const classify = (error: unknown): CrosspostOutcome => { ... }
```

Routing rules (from `RateLimitError`):
- `scope === 'shared' && !global` → `sublimit` (Discord's per-channel 10/hr).
- `!global && retryAfter > 60_000` → `sublimit` (pre-flight on sublimit-locked bucket).
- `global` → `global_ratelimit`.
- otherwise → `transient_429`.

From `DiscordAPIError`:
- code `40033` (already crossposted) → `already_done`.
- status 401/403 → `blocked`.
- status 4xx → `fatal_4xx`.
- status 5xx → `retryable_5xx`.

`HTTPError` → `retryable_5xx`. Anything else → `retryable_5xx { status: 0 }`.

**3.6 `src/gateway/rest.ts`** — `createRest(token)` returns `@discordjs/rest` with:

```ts
new REST({
  rejectOnRateLimit: rejectOnCrosspostRateLimit,  // see below
  retries: 0,
  invalidRequestWarningInterval: 1,  // emit on every invalid request
}).setToken(token);
```

Predicate:
```ts
const rejectOnCrosspostRateLimit = (data: RateLimitData): boolean => {
  const isPostSublimit = data.scope === 'shared' && data.sublimitTimeout > 0;
  const isPreflightSublimit = data.timeToReset > 60_000;
  return isPostSublimit || isPreflightSublimit;
};
```

Why these only: route-level 429s (timeToReset < 10s) are waited out by discord.js internally and we don't want to surface them as failures. Sublimits (long waits) need to bubble up so we can lock the channel in Redis.

**3.7 `src/gateway/invalidRequests.ts`** — listens to `RESTEvents.Response` and tracks `count` + `expiresAt`. Counts only:
- `status === 401` or `status === 403`, OR
- `status === 429` AND `X-RateLimit-Scope !== 'shared'`.

Public API:
- `isOverThreshold()` → boolean.
- `current()` → `{ count, expiresInMs }`.

Why not `RESTEvents.InvalidRequestWarning`? The library counts every 401/403/429 without inspecting `X-RateLimit-Scope`, so sublimit (shared) 429s inflate the count. Per Discord docs, shared 429s are excluded from the Cloudflare invalid-request budget; we mirror that. Window is fixed 10 minutes (reset-then-increment) — accurate enough for a safety-net threshold of 5 000 (half of Discord's 10k/10min cap).

**3.8 `src/gateway/passthrough.ts`** — `createPassthroughHandler(rest): RequestHandler` for non-crosspost routes. Mounts on `/api/*`. Forwards method + URL + headers (only `content-type` and `x-audit-log-reason`) and body (only when `content-length > 0` or `transfer-encoding` set — **don't pass empty bodies**, that's what caused the listener leak in earlier iterations). Streams response back. Handles `RateLimitError`, `DiscordAPIError`, `HTTPError`, `AbortError`. Logs `passthrough.slow` for >5s requests.

**3.9 `src/gateway/index.ts`** — `buildGateway({ token, invalidRequestsThreshold }): Gateway` returns `{ rest, router, invalidRequests, stats() }`. Router mounts passthrough handler at `/api/*splat`.

**3.10 `src/crosspost/gate.ts`** — pure pre-check composition:

```ts
const evaluate = async (channelId): Promise<GateVerdict> => {
  if (invalidRequests.isOverThreshold()) return { kind: 'reject', reason: 'invalid_requests' };
  if (await blocked.isBlocked(channelId)) return { kind: 'reject', reason: 'blocked' };
  if (await sublimit.isOverLimit(channelId)) return { kind: 'reject', reason: 'sublimit' };
  return { kind: 'allow' };
};
```

Order matters: invalid_requests first (system-wide), then per-channel.

**3.11 `src/crosspost/queue.ts`** — the heart. `createCrosspostQueue({ rest, gate, caches, redisUri, concurrency })` returns:
- `router: Router` with `POST /crosspost/:channelId/:messageId`:
  1. Validate IDs against `/^\d{17,19}$/`. 400 on mismatch.
  2. Run gate. invalid_requests reject → `503 Retry-After: 60`. Other reject → `204`.
  3. Check `queue.getWaitingCount()`. If ≥ 10,000 → `503 Retry-After: 30`.
  4. `queue.add('crosspost', { channelId, messageId }, { jobId: \`${channelId}-${messageId}\` })`.
     **NOTE:** BullMQ disallows `:` in `jobId`; use `-` as separator.
  5. Return `202`.
- `internalRouter: Router` with `DELETE /internal/blocked/:channelId` → calls `caches.blocked.clear(channelId)`, returns 204.
- `shutdown()` → `worker.close()` → `queue.close()` → `connection.quit()`.
- `stats()` → returns `{ waiting, active, delayed, failed, completed }` from `queue.getJobCounts(...)`.

Worker (concurrency 50, BullMQ DB 0):

```ts
const processJob = async (job) => {
  const { channelId, messageId } = job.data;
  const verdict = await gate.evaluate(channelId);
  if (verdict.kind === 'reject') {
    if (verdict.reason === 'invalid_requests') {
      await job.moveToDelayed(Date.now() + 60_000, job.token);
      throw new DelayedError();  // signals BullMQ to defer
    }
    return;  // intentional skip (blocked / sublimit)
  }
  try {
    await rest.post(Routes.channelMessageCrosspost(channelId, messageId));
    await caches.sublimit.increment(channelId);
  } catch (error) {
    const outcome = classify(error);
    await reactToOutcome(outcome, job);
  }
};
```

`reactToOutcome` switch:
- `already_done` → `sublimit.increment` + return.
- `blocked` → `blocked.set(channelId)` + return.
- `sublimit` → `sublimit.lock(channelId, retryAfterMs / 1000)` + return.
- `global_ratelimit` / `transient_429` → `job.moveToDelayed(now + min(retryAfterMs, 5min), job.token)` + `throw new DelayedError()`.
- `fatal_4xx` → log + return.
- `retryable_5xx` → `throw new Error()` to trigger BullMQ exponential backoff retry.

Worker `failed` event: ignore `DelayedError` (it's a control-flow signal, not a real failure).

**3.12 `src/http/info.ts`** — returns:

```json
{
  "data": {
    "rest": { "globalRemaining", "handlers", "activeHandlers", "hashes",
              "invalidRequests": { "count", "expiresInMs" } },
    "queue": { "waiting", "active", "delayed", "failed", "completed" },
    "sublimitCount": <Redis dbSize for sublimit DB>,
    "blockedCount": <Redis dbSize for blocked DB>
  }
}
```

**3.13 `src/http/health.ts`** — `GET /health` → `200 OK`. Used for Docker healthcheck.

**3.14 `src/http/app.ts`** — Express factory:

```ts
const app = express();
app.disable('x-powered-by');
app.get('/health', healthHandler);
app.get('/info', createInfoHandler(deps));
app.use(deps.crosspost.router);          // /crosspost/:c/:m
app.use(deps.crosspost.internalRouter);  // /internal/blocked/:c
app.use(deps.gateway.router);            // /api/*
app.use('/{*splat}', notFoundHandler);
app.use(errorHandler);
return app;
```

**3.15 `src/index.ts`** — `main()`:

1. Create two Redis clients: sublimit (DB 1), blocked (DB 2).
2. Create `SublimitCounter`, `BlockedCache`.
3. Build gateway: `buildGateway({ token: env.DISCORD_TOKEN, invalidRequestsThreshold: 5_000 })`.
4. Create gate: `createGate({ invalidRequests, blocked, sublimit })`.
5. Create crosspost module: `createCrosspostQueue({ rest, gate, caches, redisUri: env.REDIS_URI, concurrency: 50 })`.
6. Create app: `createApp({ gateway, crosspost, caches })`.
7. Listen on `env.PORT`.
8. SIGINT/SIGTERM → `crosspost.shutdown()` → `disconnectAllRedis()` → `process.exit(0)`.

### Step 4 — Bot integration

**4.1 `apps/bot/src/data/api/proxy.ts`** (replaces `crosspost-worker.ts`):

```ts
const baseUrl = 'http://proxy:8080';
const FETCH_TIMEOUT_MS = 5_000;

const enqueueCrosspost = async (channelId, messageId) =>
  fetch(`${baseUrl}/crosspost/${channelId}/${messageId}`,
    { method: 'POST', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

const clearBlocked = async (channelId) =>
  fetch(`${baseUrl}/internal/blocked/${channelId}`,
    { method: 'DELETE', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

const getInfo = async () =>
  fetch(`${baseUrl}/info`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

export const Proxy = { enqueueCrosspost, clearBlocked, getInfo };
```

5s timeout is fine because proxy ACKs in <100ms; longer is only needed for the proxy-down case.

**4.2 `apps/bot/src/services/permissions.ts`** (NEW):

```ts
const REQUIRED_FLAGS = [
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ManageMessages,
] as const;

const canCrosspostInChannel = (channel: GuildBasedChannel): boolean => {
  const me = channel.guild.members.me;
  if (!me) return false;
  const perms = channel.permissionsFor(me);
  if (!perms) return false;
  return REQUIRED_FLAGS.every((flag) => perms.has(flag));
};

const refreshChannel = async (channel: GuildBasedChannel) => {
  if (canCrosspostInChannel(channel)) {
    await Data.API.Proxy.clearBlocked(channel.id).catch((err) =>
      logger.warn({ event: 'permissions.clear_blocked_failed', channelId: channel.id, err }),
    );
  }
};

export const Permissions = { canCrosspostInChannel, refreshChannel };
```

Add to `services/index.ts` export.

**4.3 `apps/bot/src/services/crosspost.ts`** — replace existing handler:

```ts
const isCrosspostable = (message: Message): boolean => {
  if (message.system) return false;
  if (message.flags.has(MessageFlags.IsCrosspost)) return false;
  if (message.flags.has(MessageFlags.Crossposted)) return false;
  return true;
};

const handle = async (message: Message, channel: NewsChannel) => {
  if (!isCrosspostable(message)) return;
  if (!Services.Permissions.canCrosspostInChannel(channel)) return;

  if (!message.content) return push(message);
  const hasUrl = urlRegex({ strict: true, localhost: false }).test(message.content);
  const hasEmbeds = Boolean(message.embeds.length);
  if (hasUrl && !hasEmbeds) await sleep(secToMs(5));
  return push(message);
};

const push = async (message: ReceivedMessage) => {
  try {
    return await Data.API.Proxy.enqueueCrosspost(message.channel.id, message.id);
  } catch (error) {
    logger.warn({ event: 'crosspost.push_failed', ... }, 'Failed to enqueue crosspost');
  }
};
```

**Critical: do NOT call `members.me?.fetch()` here.** That forces an API call per message and is the bug that caused 5-6s queue waits cascading into bot timeouts. The cached `members.me` is correct after `clientReady` because discord.js auto-populates it from `GUILD_CREATE`.

**4.4 Permission listeners** — add to `apps/bot/src/listeners/permissions/`:

- `channelUpdate.ts` → on `Events.ChannelUpdate`, if `newChannel.type === ChannelType.GuildAnnouncement`, call `Services.Permissions.refreshChannel(newChannel)`.
- `guildMemberUpdate.ts` → on `Events.GuildMemberUpdate`, if `newMember.id === client.user?.id`, iterate guild's announcement channels and refresh each.
- `roleUpdate.ts` → on `Events.GuildRoleUpdate`, if `newRole.guild.members.me.roles.cache.has(newRole.id)`, iterate guild's announcement channels and refresh each.

**Don't add a `guildCreate` startup-sweep listener.** It would fire ~10-20k DELETE requests against the proxy on every startup with mostly no-op effect; the 1h TTL on blocked entries handles stale data.

**4.5 `apps/bot/src/services/info.ts`** — update return type to match new `/info` shape (`rest.invalidRequests`, `queue`, `sublimitCount`, `blockedCount`).

**4.6 `apps/bot/src/handlers/admin/info.ts`** — update display to match new fields. See `services/bot/src/utils/admin-commands/info.ts` on `refactor/proxy` for the reference layout.

**4.7 Bot's discord.js REST config** (in `apps/bot/src/lib/shard.ts` or equivalent):

```ts
rest: {
  api: 'http://proxy:8080/api',
  globalRequestsPerSecond: Number.POSITIVE_INFINITY,  // proxy is the global limiter
  timeout: 60_000,                                    // for non-crosspost calls
},
```

**4.8 Process error handlers** (in bot entry + shard entry) — prevents stray AbortErrors from killing clusters:

```ts
process.on('uncaughtException', (err) => logger.error({ event: '...', err }));
process.on('unhandledRejection', (reason) => logger.error({ event: '...', err: reason }));
```

**4.9 Cluster respawn backoff** (in `ClusterManager.ts` or equivalent) — prevents tight respawn loops from burning the invalid-requests budget:

- Pass `respawn: false` to `BaseClusterManager` constructor.
- Listen on `clusterCreate` → cluster's `'death'` event.
- Schedule respawn with exponential backoff: 5s, 30s, 60s, 5min, 10min (capped). Reset failure count after 10 min of stable operation.
- See `services/bot/src/structures/ClusterManager.ts` on `refactor/proxy` for reference impl.

### Step 5 — Docker / infra

**Compose** — minimal proxy service definition:

```yaml
proxy:
  build:
    context: .
    dockerfile: apps/proxy/Dockerfile
  environment:
    DISCORD_TOKEN: ${DISCORD_TOKEN}
    REDIS_URI: redis://cache:6379
    LOGGER_LEVEL: info
  depends_on:
    cache:
      condition: service_healthy
  healthcheck:
    test: ['CMD', 'wget', '-qO-', 'http://localhost:8080/health']
    interval: 30s
    timeout: 5s
    retries: 3
```

Bot env: bot's discord.js REST and `Data.API.Proxy` both point at `http://proxy:8080`.

**Redis** — single instance (named `cache`), uses 3 logical databases:
- DB 0: BullMQ queue.
- DB 1: sublimit counter.
- DB 2: blocked cache.

No invalid-requests Redis DB needed (lives in-process).

### Step 6 — Validation

After deploying:

1. **Startup health.** Proxy logs three `redis.connected` lines (DB 0/1/2), then `proxy.listening`. No errors.
2. **Bot startup.** Cluster ready logs appear; no `AbortError` storms.
3. **Crosspost smoke test.** Send a message in an announcement channel. Within ~1s:
   - Bot logs nothing (silent success path).
   - Proxy `/info` shows `queue.completed` increment.
   - Sublimit counter increments for that channel (`sublimitCount` may grow).
4. **Burst test.** Send 12 messages rapidly in one announcement channel:
   - First 10 publish; messages 11-12 either appear in `queue.delayed` or skipped at gate (logs `crosspost.rejected` with `reason: 'sublimit'`).
   - No bot-side errors.
5. **Permission test.** Remove `ManageMessages` from the bot in a channel, send a message, restore permission, send another. First message → no proxy call (sync gate filter). Restoration → next message publishes (after `channelUpdate` invalidates blocked cache if it was previously cached).
6. **`/info` admin command** shows queue + REST + cache stats correctly.
7. **Watch over 24h.** Queue depth should oscillate (cyclic load) rather than grow monotonically. Invalid-requests count should stay low (< 50 in steady state).

---

## 5. Things to NOT do (lessons from prior iterations)

- **Don't add `members.me?.fetch()` per message.** Use cache-only `permissionsFor`. The `.fetch()` call was the cause of the 5-6s cascading-timeout outage.
- **Don't drop messages on transient 429 / 5xx / network errors.** They must always become BullMQ retries. Only intentional skips drop messages.
- **Don't reject in `rejectOnRateLimit` for short bucket waits.** discord.js handles those internally. Only reject on sublimit (long waits).
- **Don't use `:` in BullMQ `jobId`** — BullMQ explicitly disallows it. Use `-`.
- **Don't pass empty bodies through `passThroughBody: true`.** Caused listener leaks. Only set body when `content-length > 0` or `transfer-encoding` present.
- **Don't add a `guildCreate` permission-refresh sweep.** Fires 10-20k DELETE requests on every startup with mostly no-op effect. Live `channelUpdate`/`guildMemberUpdate`/`roleUpdate` listeners + 1h TTL cover real changes.
- **Don't build a separate REST instance for crossposts vs. interactions.** Single REST with `globalRequestsPerSecond: 50`; interactions use `BurstHandler` which naturally bypasses crosspost queueing.
- **Don't count 400/404/422 etc. toward the invalid-requests tracker.** Per Discord docs, only 401/403/429 count — and 429 with `X-RateLimit-Scope: shared` is excluded. The `@discordjs/rest` `InvalidRequestWarning` event does **not** check scope, so it inflates the count by every sublimit hit. Listen to `RESTEvents.Response` and inspect headers directly (see [ADR 0003](./adr/0003-invalid-requests-in-memory.md)).
- **Don't make the bot's fetch to proxy await Discord's response.** Proxy ACKs 202 in <100ms; bot needs no info back.
- **Don't add a persistent retry queue for messages.** Discord doesn't replay events when bot is offline; there's no backlog to recover. BullMQ already persists in-flight jobs across proxy restarts.

---

## 6. Operational notes

- **Queue at peak.** 50 req/s is the global ceiling. If 11k+ guilds collectively produce >50 crossposts/s sustained, the queue grows. Acceptable; drains during off-peak. Monitor `/info` waiting count over a 24h cycle to confirm cyclic vs monotonic growth.
- **CF ban diagnosis.** If `wget https://discord.com/api/v10/gateway` returns 429 with Cloudflare headers, the host IP is banned. Stop the bot, wait 10-20 min, restart. The invalid-requests shed (5k threshold) prevents re-triggering.
- **Redis pressure.** If `redis.timeout` warnings appear frequently in proxy logs, bump `REDIS_TIMEOUT_MS` (currently 500ms) or check Redis CPU. Fail-open semantics mean crossposts are not dropped on Redis blips.
- **Multiple bot tokens.** The 50/s ceiling is per-token. If permanent overload becomes unavoidable, the only horizontal scaling option is sharding guilds across multiple bot tokens (each gets its own 50/s budget). Architectural changes inside one token can't exceed Discord's limit.
