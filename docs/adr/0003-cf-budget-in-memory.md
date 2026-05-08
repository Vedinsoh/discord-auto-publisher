# ADR 0003: CF budget tracked in-memory via REST events

## Status

Accepted — 2026-05-08

## Context

Cloudflare bans the bot's egress IP if more than ~10 000 invalid requests (401/403/429) are seen in a 10-minute rolling window. The Proxy must shed crosspost work before this threshold is crossed.

`@discordjs/rest` already tracks invalid requests internally and emits `RESTEvents.InvalidRequestWarning` with `{ count, remainingTime }` — the same window Cloudflare uses. The previous design hand-counted invalid responses via `Redis DB 1` (`InvalidRequestsCounter`) inside both the passthrough error handler and the crosspost worker.

Since the Proxy is single-process by [ADR 0001](./0001-proxy-stays-single-process.md), the REST instance is the single source of truth for invalid-request counts on this egress IP. Redis is unnecessary.

## Decision

The CF-budget tracker is in-memory. It listens on `RESTEvents.InvalidRequestWarning` (with `invalidRequestWarningInterval: 1` so every invalid request fires the event) and stores `{ count, expiresAt }`. The crosspost gate reads this synchronously to decide whether to shed.

The hand-rolled counter at `services/discord-proxy/src/redis/invalidRequestsCounter.ts` and Redis DB 1 are removed. Manual `InvalidRequestsCounter.increment(status)` calls in passthrough and worker are removed.

## Consequences

- Strictly more accurate than the prior hand-counted tally — discord.js correctly excludes shared-scope 429s from the count, where our manual code had to special-case it.
- One fewer Redis database, one fewer connection, one fewer failure mode.
- Gate decisions are synchronous on this dimension (no Redis round-trip).
- **Multi-replica deployment is now incompatible.** Two Proxy replicas behind one egress IP would each track only their own slice of invalid requests, undercounting against the CF budget. If multi-replica becomes a goal, CF budget moves back to a shared store and this ADR is reopened.
- Restarting the Proxy resets the count. This is acceptable because Cloudflare's window is also rolling and the Proxy is rarely restarted under load.
