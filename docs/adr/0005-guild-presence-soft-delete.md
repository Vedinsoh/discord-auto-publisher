# ADR 0005: Guild presence via reconciled soft-deleted rows

## Status

Accepted — 2026-07-04

## Context

A `guild` table row previously meant two conflated things: "the bot is in this guild" (dashboard `botPresent`, premium revocation backstop) and "this guild is migrated to the v7 allowlist model" (cache-sync rebuilt Redis `MigratedGuilds` markers from bare row existence). Rows were written only by `guildCreate` and first channel enable, so legacy v6 guilds had no row and showed as bot-absent, any gateway event missed during downtime drifted the table permanently (a `supabase db reset` exposed this), missing rows hid revoked-but-present guilds from billing enforcement, and an accidental kick cascaded away all channel config instantly.

## Decision

- **Presence semantics**: a `guild` row with `deletedAt IS NULL` means "bot is in this guild" — legacy guilds included. Migration state moves to an explicit `migratedAt` column (`NULL` = legacy); Postgres is the source of truth and the `MigratedGuilds` Redis DB is a derived cache.
- **Soft delete**: kick/leave and the reconciliation sweep set `deletedAt`; channel config and cache entries survive, so re-invite restores everything (including legacy status — `migratedAt` is preserved). Hard delete (full cascade) happens only via the reconciliation purge, 30 days after soft delete. Mirrors the billing rule "subscription outlives the guild row" (ADR 0004).
- **Reconciliation**: a daily backend cron (03:30, before subscription reconcile) plus a manual internal trigger (`POST /internal/reconcile/guilds`) pages the bot's guild list (`GET /users/@me/guilds` via proxy) and sweeps bidirectionally: insert unknown guilds as legacy (`migratedAt = NULL` — behavior-preserving even for missed `guildCreate` events), restore soft-deleted live guilds, soft-delete departed guilds, purge expired ones. Rails: abort the whole sweep on any pagination error; never soft-delete rows created within 1h of sweep start (join race); refuse deletions beyond `max(50, 10% of active rows)` (truncated-list protection).
- **Migration writes are DB-first with a strictly derived cache**: `Guilds.migrate` runs one Postgres transaction (channel rows + `migratedAt`), then rebuilds Redis (channel entries first, `MigratedGuilds` marker last). The marker is the behavioral commit point — until it is set the bot treats the guild as fully legacy, so every partial state is behavior-preserving and no compensating rollbacks exist. Startup cache-sync is the crash backstop.

## Alternatives considered

- **Bot-pushed presence cache** (bot reports its guild list into Redis on ready/interval): couples presence to bot uptime and shard lifecycle, loses history needed for the 30-day grace window, and still needs a DB backfill for the dashboard — rejected.
- **Add-only sweep** (insert missing rows, never delete): fixes the legacy-guild dashboard gap but leaves ghost rows that break the premium revocation backstop in the other direction (bot long gone, row says present) — rejected.
- **Hard delete on kick** (status quo): simplest, but a single accidental kick destroys all configuration and any missed `guildDelete` leaves permanent drift with no repair path — rejected.

## Consequences

- Dashboard `botPresent` and billing enforcement stay honest even across missed gateway events and DB resets; one manual reconcile repairs a wiped table.
- Accidental kicks are recoverable for 30 days with zero user action beyond re-inviting.
- The `guild` table now contains soft-deleted rows and legacy rows — every presence read must filter `deleted_at IS NULL`, and "is migrated" must check `migratedAt`, not row existence.
- Sunset plan: `migratedAt`, the `MigratedGuilds` and `LegacyGuildPerms` Redis DBs, and all legacy UX are dropped together ~6 months after v7 ships; `deletedAt` and the reconciliation cron are permanent. At sunset, still-legacy guilds with ≤3 publishable announcement channels are auto-enabled; larger ones are hard cut off (decided in principle, details revisited at sunset).
