# Discord Auto Publisher — Architectural Context

## Services

- **Bot** (`services/bot`) — discord.js gateway client(s). Receives WS events, filters crosspost-eligible messages, forwards crosspost intents to the Proxy, then forgets. The bot's discord.js `Client` is configured with `rest.api: 'http://proxy:8080/api'` and `globalRequestsPerSecond: Infinity` — all Discord REST traffic flows through the Proxy.

- **Proxy** (`services/proxy`) — single Node process. Sole purpose: **rate-limit synchronization across shards via a shared in-memory `@discordjs/rest` REST instance.** All other concerns (crosspost queue, gate, error classification) live here because the Proxy is the natural home for any code wanting to make Discord REST calls with the shared bucket state.

## Domain terms

- **Crosspost** — the Discord operation `POST /channels/:id/messages/:id/crosspost`. The thing we exist to automate.

- **Passthrough** — any non-crosspost Discord REST request from the bot's discord.js Client. Forwarded by the Proxy unchanged with all `x-ratelimit-*` headers preserved, since the bot's Client uses them to maintain its handler/hash collections.

- **Invalid requests** — the rolling 10-minute count of invalid requests Cloudflare uses to ban an egress IP. Counts 401, 403, and 429 except those with `X-RateLimit-Scope: shared`. Tracked in-memory via `RESTEvents.Response`. Single-replica only.

- **Sublimit** — Discord's per-channel 10/hour shared 429 on crossposts. Surfaces as `RateLimitError` with `scope: 'shared'`.

- **Blocked cache** — negative TTL'd record marking a channel as un-crosspostable (401/403). Cleared by the bot via `DELETE /internal/blocked/:id` on permission updates.

## Internal Proxy modules

- **Gateway** — owns the `REST` instance, the `rejectOnRateLimit` predicate, REST event listeners, the invalid-requests tracker, and the passthrough Express route. Pure rate-limit-sync concern.

- **Crosspost** — owns the BullMQ queue + worker, the gate (invalid-requests + blocked + sublimit), the Discord-error classifier, the Redis-backed caches, and the enqueue Express route.

The Crosspost module calls `Gateway.rest.post(...)` directly (in-process function call, not HTTP).

## Load-bearing decisions

- **Single process.** The v7 three-tier split (`bot → crosspost-worker → proxy`) was speculative and untested in production. The proven shape is one process — the Proxy's only reason to exist is shared rate-limit state, which doesn't benefit from another network hop.

- **Explicit RPC bot↔proxy for crossposts.** Bot calls `POST /crosspost/:channelId/:messageId` (empty body) instead of letting the Proxy intercept Discord-shaped URLs. Keeps the async-queue semantics visible at the call site.

- **Invalid-requests in-memory.** Relies on single-replica deployment. Multi-replica deployment requires moving this back to Redis.
