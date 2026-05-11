# ADR 0001: Proxy stays single-process

## Status

Accepted — 2026-05-08

## Context

The Proxy's only architectural reason to exist is rate-limit synchronization across shards via a shared in-memory `@discordjs/rest` REST instance. Everything else (crosspost queue, gate, error classification, caches) lives in the Proxy because it is the natural home for code that wants to make Discord REST calls under the shared bucket state.

The `refactor/v7` branch experimented with splitting these concerns into two services: `proxy` (passthrough only) and `crosspost-worker` (queue + worker + classifier), with the worker calling the proxy over HTTP for the actual Discord crosspost call. This three-tier shape was speculative and was never load-tested in production. The single-process shape on `refactor/proxy` is the proven one, and `v7` will be updated to drop `crosspost-worker` and adopt the same single-process design.

## Decision

The Proxy is one Node process. The Crosspost module calls the Gateway's REST instance directly via in-process function calls — no HTTP hop between them. Scaling out to multiple processes is not a goal; if it becomes one, this ADR is reopened together with [ADR 0003](./0003-invalid-requests-in-memory.md).

## Consequences

- One Docker container, one port, one lifecycle to manage.
- The Crosspost worker shares the same REST bucket state as passthrough — both contribute to and observe the same rate-limit handlers.
- Multi-replica deployment is not currently supported. Doing so would require sharing the invalid-requests tracker state ([ADR 0003](./0003-invalid-requests-in-memory.md)) and routing crosspost traffic to a single replica or sharding by `channelId`.
- The internal split into `Gateway` and `Crosspost` modules is justified by testability and locality, not by anticipating a future service split.
