# ADR 0003: Invalid requests tracked in-memory via REST events

## Status

Accepted — 2026-05-08
Updated — 2026-05-10 (switched source from `InvalidRequestWarning` to `Response` event to exclude shared-scope 429s)

## Context

Cloudflare bans the bot's egress IP if more than ~10 000 invalid requests (401/403/429) are seen in a 10-minute rolling window. The Proxy must shed crosspost work before this threshold is crossed.

Per [Discord's docs](https://docs.discord.com/developers/topics/rate-limits#invalid-request-limit-aka-cloudflare-bans), 429 responses with `X-RateLimit-Scope: shared` are **not** counted by Cloudflare. Sublimit responses on the crosspost route arrive with `scope=shared` and must be excluded.

`@discordjs/rest` exposes two relevant events:

- `RESTEvents.InvalidRequestWarning` — fires on 401/403/429 but does **not** check `X-RateLimit-Scope` before counting (see `incrementInvalidCount` in `dist/index.js`). Inflates the count by every shared 429.
- `RESTEvents.Response` — fires once per response with the raw `Response` object, allowing direct inspection of `X-RateLimit-Scope`.

The previous design hand-counted invalid responses via Redis with unique UUID keys and a 10-min TTL. Single-process Proxy ([ADR 0001](./0001-proxy-stays-single-process.md)) makes Redis unnecessary for this counter.

## Decision

The invalid-requests tracker is in-memory. It listens on `RESTEvents.Response` and increments only when:

- `status === 401` or `status === 403`, OR
- `status === 429` AND `X-RateLimit-Scope !== 'shared'`

It stores `{ count, expiresAt }` with a fixed 10-minute window — first counted request after expiry resets the window and starts at count=1, mirroring the library's internal logic.

The crosspost gate reads this synchronously to decide whether to shed.

`InvalidRequestWarning` is no longer used. `invalidRequestWarningInterval` is dropped from REST options.

## Consequences

- Excludes shared-scope 429s correctly — produces a count consistent with what Cloudflare actually sees on its end.
- Strictly more accurate than the prior hand-counted tally and than `InvalidRequestWarning`.
- One fewer Redis database, one fewer connection, one fewer failure mode.
- Gate decisions are synchronous on this dimension (no Redis round-trip).
- **Multi-replica deployment is now incompatible.** Two Proxy replicas behind one egress IP would each track only their own slice of invalid requests, undercounting against the CF budget. If multi-replica becomes a goal, the tracker moves back to a shared store and this ADR is reopened.
- Restarting the Proxy resets the count. Acceptable because Cloudflare's window is also rolling and the Proxy is rarely restarted under load.
- Fixed-window approximation: count snaps to 0 at window expiry rather than decaying continuously. Cheaper than a sliding window and accurate enough for a safety-net threshold of 5 000.
