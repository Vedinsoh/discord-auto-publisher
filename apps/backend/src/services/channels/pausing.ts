import { channel as channelTable, db } from '@ap/database';
import { FilterMatchMode } from '@ap/validations';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { logger } from 'utils/logger.js';

/**
 * Channel soft-pause primitives (ADR 0008). Pure DB + cache operations with NO
 * edition/managing-edition awareness — the CALLER decides when to pause or
 * reactivate (that decision lives in `Editions.reconcileChannelServing`, which
 * this module deliberately does not import, so `handover.ts` can reactivate on
 * swap without an import cycle through `editions.ts`).
 *
 * Serving iff `pausedAt IS NULL`. A paused channel keeps its row + filters but
 * is dropped from the `Channels` Redis allowlist (bot hot path) and excluded
 * from the per-guild limit count.
 */

/**
 * Pause the newest serving channels beyond `keep`, keeping the oldest `keep` by
 * `createdAt` (snowflake id as the deterministic tiebreak — a bulk migrate
 * inserts every row with the same `createdAt`). Removes the paused channels from
 * the allowlist. Returns the number paused.
 */
const pauseExcess = async (guildId: Snowflake, keep: number): Promise<number> => {
  const serving = await db
    .select({ channelId: channelTable.channelId })
    .from(channelTable)
    .where(and(eq(channelTable.guildId, guildId), isNull(channelTable.pausedAt)))
    .orderBy(asc(channelTable.createdAt), asc(channelTable.channelId));

  if (serving.length <= keep) return 0;

  const toPause = serving.slice(keep).map(c => c.channelId);
  await db
    .update(channelTable)
    .set({ pausedAt: new Date() })
    .where(inArray(channelTable.channelId, toPause));
  await Data.Channels.Cache.removeMany(toPause);

  logger.info(`Paused ${toPause.length} over-limit channels for guild ${guildId} (kept ${keep})`);
  return toPause.length;
};

/**
 * Reactivate every paused channel of a guild — clears `pausedAt` and restores
 * the allowlist entries (with their retained filters). Called when the managing
 * edition becomes premium (unlimited). Returns the number reactivated.
 */
const reactivateGuild = async (guildId: Snowflake): Promise<number> => {
  const paused = await db
    .select({
      channelId: channelTable.channelId,
      filters: channelTable.filters,
      filterMode: channelTable.filterMode,
    })
    .from(channelTable)
    .where(and(eq(channelTable.guildId, guildId), isNotNull(channelTable.pausedAt)));

  if (paused.length === 0) return 0;

  await db
    .update(channelTable)
    .set({ pausedAt: null })
    .where(and(eq(channelTable.guildId, guildId), isNotNull(channelTable.pausedAt)));
  await Data.Channels.Cache.setMany(
    paused.map(p => ({
      channelId: p.channelId,
      filters: p.filters,
      filterMode: (p.filterMode as FilterMatchMode) || FilterMatchMode.Any,
    }))
  );

  logger.info(`Reactivated ${paused.length} paused channels for guild ${guildId}`);
  return paused.length;
};

export const ChannelPausing = { pauseExcess, reactivateGuild };
