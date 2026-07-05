import { db, guild } from '@ap/database';
import { CronJob } from 'cron';
import type { Snowflake } from 'discord-api-types/globals';
import { type RESTGetAPICurrentUserGuildsResult, Routes } from 'discord-api-types/v10';
import { and, inArray, isNull, lt } from 'drizzle-orm';
import { Discord } from 'services/discord.js';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

const PAGE_SIZE = 200;
const BATCH_SIZE = 1000;
const JOIN_RACE_GUARD_MS = 60 * 60 * 1000;
const PURGE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

let inFlight = false;

export const isGuildReconcileInFlight = () => inFlight;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

/**
 * Fetch the bot's full guild list via the proxy. Throws on any page error —
 * the sweep must never act on a partial snapshot.
 */
const fetchLiveGuildIds = async (): Promise<Set<Snowflake>> => {
  const ids = new Set<Snowflake>();
  let after: Snowflake | undefined;

  while (true) {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (after) query.set('after', after);

    const page = (await Discord.rest.get(Routes.userGuilds(), {
      query,
    })) as RESTGetAPICurrentUserGuildsResult;

    for (const g of page) {
      ids.add(g.id);
    }

    if (page.length < PAGE_SIZE) break;
    after = page[page.length - 1]?.id;
  }

  return ids;
};

/**
 * Daily sweep keeping the guild table honest against Discord (missed gateway
 * events, DB resets): inserts unknown guilds as legacy, restores soft-deleted
 * guilds the bot is still in, soft-deletes guilds the bot left, and purges
 * rows soft-deleted more than 30 days ago.
 */
const reconcileGuilds = async () => {
  const sweepStart = new Date();

  // Any pagination error aborts before DB writes
  const liveIds = await fetchLiveGuildIds();

  const rows = await db
    .select({ guildId: guild.guildId, createdAt: guild.createdAt, deletedAt: guild.deletedAt })
    .from(guild);
  const knownIds = new Set(rows.map(r => r.guildId));

  // Unknown guilds have been running legacy since the missed guildCreate —
  // inserting with migratedAt = NULL is behavior-preserving
  const toInsert = [...liveIds].filter(id => !knownIds.has(id));
  for (const batch of chunk(toInsert, BATCH_SIZE)) {
    await db
      .insert(guild)
      .values(batch.map(guildId => ({ guildId })))
      .onConflictDoNothing();
  }

  // Bot is in the guild but the row is soft-deleted (missed guildCreate after
  // a kick, or a sweep false positive) — restore; migratedAt is preserved
  const toRestore = rows
    .filter(r => r.deletedAt !== null && liveIds.has(r.guildId))
    .map(r => r.guildId);
  for (const batch of chunk(toRestore, BATCH_SIZE)) {
    await db.update(guild).set({ deletedAt: null }).where(inArray(guild.guildId, batch));
  }

  // Soft-delete rows not in the live set, with rails:
  // - join-race guard: never touch rows created within 1h of sweep start
  //   (guild may have joined mid-pagination)
  // - deletion cap: a truncated live list must not mass-delete
  const activeRows = rows.filter(r => r.deletedAt === null);
  const ageGuard = new Date(sweepStart.getTime() - JOIN_RACE_GUARD_MS);
  const toSoftDelete = activeRows
    .filter(r => !liveIds.has(r.guildId) && r.createdAt < ageGuard)
    .map(r => r.guildId);

  const deletionCap = Math.max(50, Math.ceil(activeRows.length * 0.1));
  const deletionsAborted = toSoftDelete.length > deletionCap;

  if (deletionsAborted) {
    logger.error(
      `Guild reconcile: refusing to soft-delete ${toSoftDelete.length} guilds (cap ${deletionCap}) — live list may be truncated`
    );
  } else {
    for (const batch of chunk(toSoftDelete, BATCH_SIZE)) {
      await db
        .update(guild)
        .set({ deletedAt: sweepStart })
        .where(and(inArray(guild.guildId, batch), isNull(guild.deletedAt)));
    }
  }

  // Purge: hard-delete (cascade + cache cleanup) after the 30-day grace window
  const purgeCutoff = new Date(sweepStart.getTime() - PURGE_AFTER_MS);
  const toPurge = await db
    .select({ guildId: guild.guildId })
    .from(guild)
    .where(lt(guild.deletedAt, purgeCutoff));

  let purgedCount = 0;
  for (const row of toPurge) {
    if (await Services.Guilds.purge(row.guildId, purgeCutoff)) purgedCount++;
  }

  logger.info(
    `Guild reconcile finished: ${liveIds.size} live, ${toInsert.length} inserted, ${toRestore.length} restored, ${deletionsAborted ? `0 soft-deleted (ABORTED: ${toSoftDelete.length} > cap ${deletionCap})` : `${toSoftDelete.length} soft-deleted`}, ${purgedCount} purged`
  );
};

export const runGuildReconcile = async (): Promise<void> => {
  if (inFlight) {
    logger.warn('Guild reconcile already in flight, skipping');
    return;
  }

  inFlight = true;
  try {
    await reconcileGuilds();
  } catch (error) {
    logger.error(error, 'Guild reconcile failed');
  } finally {
    inFlight = false;
  }
};

export const startGuildReconcile = () => {
  const job = new CronJob('30 3 * * *', runGuildReconcile);
  job.start();
  logger.info('Guild reconcile cron started (daily at 03:30)');
};
