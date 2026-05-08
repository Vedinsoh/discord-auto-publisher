# ADR 0002: Explicit RPC for crosspost enqueue, not URL interception

## Status

Accepted — 2026-05-08

## Context

The Bot's discord.js Client routes all REST traffic through the Proxy (`rest.api: 'http://proxy:8080/api'`). One option for enqueueing crossposts is to let the Bot call discord.js's native `channel.messages.crosspost(messageId)` and have the Proxy intercept the resulting `POST /api/v10/channels/:id/messages/:id/crosspost` URL, divert it into the BullMQ queue, and ACK with 202.

The DX appeal: the Bot uses one URL base and one abstraction (discord.js), with no crosspost-specific RPC client.

The semantic problems:

- discord.js's `channel.messages.crosspost(messageId)` returns `Promise<Message>` and patches the cached message on success. A 202-with-empty-body response either no-ops the patch or throws inside `new Message(client, data)`. The only fix is to fabricate a Message-shaped payload, which would lie to the Bot's cache.
- The async-queue nature gets hidden behind a sync-looking API. A reader of `await channel.messages.crosspost(id)` reasonably assumes the crosspost happened. Reality: queued, may be deduped, may be silently dropped by the gate.
- Errors from our gate (CF-budget shed, cant-post cache, etc.) would arrive at the Bot wrapped as discord.js exceptions, conflated with real Discord errors.
- The Discord URL has no body, foreclosing any future enqueue metadata.

## Decision

The Bot calls a dedicated proxy endpoint:

```
POST /crosspost/:channelId/:messageId
```

Empty body. The Bot's `Proxy` client exposes `enqueueCrosspost(channelId, messageId)` as the only crosspost-related method. The Proxy does not regex-match Discord-shaped crosspost URLs from passthrough traffic; if any future code path calls `channel.messages.crosspost()` on the Bot's discord.js Client, that request flows through passthrough and hits Discord directly, bypassing the queue. Convention is enforced by code review, not by interception.

## Consequences

- The Bot's mental model is honest: "observe a WS event, tell the Proxy, forget."
- Future enqueue metadata (origin shard, dedup hints, telemetry tags) can ride in the request body without contract breakage.
- The Bot speaks two URL bases to the Proxy (`/api/v10/...` for discord.js Client traffic, `/crosspost/...` for enqueue). This is acceptable; the two paths represent two different concerns.
- Any contributor who calls `channel.messages.crosspost()` directly is bypassing the queue. This must be caught in review.
