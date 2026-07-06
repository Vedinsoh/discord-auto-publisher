import type { Edition } from '@ap/api-types';
import { botPresence, db, guild } from '@ap/database';
import { Keys } from '@ap/redis';
import { CronJob } from 'cron';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import { type RESTGetAPICurrentUserGuildsResult, Routes } from 'discord-api-types/v10';
import { and, countDistinct, eq, inArray, isNull, sql } from 'drizzle-orm';
import { Discord } from 'services/discord.js';
import { Services } from 'services/index.js';
import { isEntitledStatus } from 'services/subscriptions.js';
import { alerter } from 'utils/alerts.js';
import { logger } from 'utils/logger.js';

const PAGE_SIZE = 200;
const BATCH_SIZE = 1000;
const JOIN_RACE_GUARD_MS = 60 * 60 * 1000;
const PURGE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

const EDITIONS: Edition[] = ['free', 'premium'];

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
 * Fetch an edition bot's full guild list via its proxy. Throws on any page
 * error — the sweep must never act on a partial snapshot.
 */
const fetchLiveGuildIds = async (edition: Edition): Promise<Set<Snowflake>> => {
  const ids = new Set<Snowflake>();
  let after: Snowflake | undefined;

  while (true) {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (after) query.set('after', after);

    const page = (await Discord.restFor(edition).get(Routes.userGuilds(), {
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
 * Per-edition sweep keeping the presence rows honest against Discord (missed
 * gateway events, DB resets): inserts unknown guilds as legacy with an active
 * presence, restores presences the bot still has, and soft-deletes presences
 * the bot lost. Makes NO leave decisions itself — those need both editions'
 * reconciled state, so they run afterwards in applyJoinRails. Returns the
 * inserted + restored guild IDs as rail candidates.
 */
const sweepEdition = async (edition: Edition): Promise<Snowflake[]> => {
  if (!Discord.hasToken(edition)) {
    logger.warn(`Guild reconcile: no ${edition} token configured, skipping sweep`);
    return [];
  }

  const sweepStart = new Date();

  // Any pagination error aborts before DB writes
  const liveIds = await fetchLiveGuildIds(edition);

  const rows = await db
    .select({
      guildId: botPresence.guildId,
      joinedAt: botPresence.joinedAt,
      leftAt: botPresence.leftAt,
    })
    .from(botPresence)
    .where(eq(botPresence.edition, edition));
  const knownIds = new Set(rows.map(r => r.guildId));

  // Unknown guilds have been running legacy since the missed guildCreate —
  // inserting with migratedAt = NULL is behavior-preserving
  const toInsert = [...liveIds].filter(id => !knownIds.has(id));
  for (const batch of chunk(toInsert, BATCH_SIZE)) {
    await db
      .insert(guild)
      .values(batch.map(guildId => ({ guildId })))
      .onConflictDoNothing();
    await db
      .insert(botPresence)
      .values(batch.map(guildId => ({ guildId, edition, joinedAt: sweepStart })))
      .onConflictDoNothing();
  }

  // Bot is in the guild but the presence is soft-deleted (missed guildCreate
  // after a kick, or a sweep false positive) — restore; joinedAt is preserved
  const toRestore = rows
    .filter(r => r.leftAt !== null && liveIds.has(r.guildId))
    .map(r => r.guildId);
  for (const batch of chunk(toRestore, BATCH_SIZE)) {
    await db
      .update(botPresence)
      .set({ leftAt: null })
      .where(and(inArray(botPresence.guildId, batch), eq(botPresence.edition, edition)));
  }

  // Soft-delete presences not in the live set, with rails:
  // - join-race guard: never touch presences joined within 1h of sweep start
  //   (guild may have joined mid-pagination)
  // - deletion cap: a truncated live list must not mass-delete
  const activeRows = rows.filter(r => r.leftAt === null);
  const ageGuard = new Date(sweepStart.getTime() - JOIN_RACE_GUARD_MS);
  const toSoftDelete = activeRows
    .filter(r => !liveIds.has(r.guildId) && r.joinedAt < ageGuard)
    .map(r => r.guildId);

  const deletionCap = Math.max(50, Math.ceil(activeRows.length * 0.1));
  const deletionsAborted = toSoftDelete.length > deletionCap;

  if (deletionsAborted) {
    logger.error(
      `Guild reconcile (${edition}): refusing to soft-delete ${toSoftDelete.length} presences (cap ${deletionCap}) — live list may be truncated`
    );
    alerter.send(`guild-reconcile-deletion-cap:${edition}`, {
      title: 'Guild reconcile deletion cap tripped',
      description: `Refused to soft-delete ${toSoftDelete.length} ${edition} presences (cap ${deletionCap}, ${activeRows.length} active). Discord's live guild list may be truncated — investigate before the next sweep.`,
    });
  } else {
    for (const batch of chunk(toSoftDelete, BATCH_SIZE)) {
      await db
        .update(botPresence)
        .set({ leftAt: sweepStart })
        .where(
          and(
            inArray(botPresence.guildId, batch),
            eq(botPresence.edition, edition),
            isNull(botPresence.leftAt)
          )
        );
    }
    // A lost presence ends any pending handover for that guild (missed
    // guildDelete would otherwise leave the marker dangling)
    for (const guildId of toSoftDelete) {
      await Services.Handover.clearPending(guildId);
    }
  }

  logger.info(
    `Guild reconcile (${edition}) finished: ${liveIds.size} live, ${toInsert.length} inserted, ${toRestore.length} restored, ${deletionsAborted ? `0 soft-deleted (ABORTED: ${toSoftDelete.length} > cap ${deletionCap})` : `${toSoftDelete.length} soft-deleted`}`
  );

  return [...toInsert, ...toRestore];
};

/**
 * Guilds where both editions' bots are currently active — the only state in
 * which a handover marker (or a missing one) matters.
 */
const getDualActiveGuildIds = async (): Promise<Snowflake[]> => {
  const rows = await db
    .select({ guildId: botPresence.guildId })
    .from(botPresence)
    .where(isNull(botPresence.leftAt))
    .groupBy(botPresence.guildId)
    .having(eq(countDistinct(botPresence.edition), 2));
  return rows.map(r => r.guildId);
};

/**
 * Join-decision rails for guilds whose register call the backend never saw
 * (missed guildCreate) — the same orchestration `registerNewGuild` runs, but
 * evaluated on RECONCILED presence rows only, after both sweeps:
 * - premium present with an existing not-entitled subscription → leave via
 *   premium proxy. A MISSING subscription row is deliberately not grounds to
 *   leave here: after a DB reset this sweep runs before the subscription
 *   reconcile has repopulated rows from Paddle, and kicking every premium
 *   guild would be catastrophic — the 04:00 revocation backstop owns that.
 * - both bots present without a marker → set the handover marker (premium
 *   idles; its stale in-memory latch, if any, resets on evaluate-swap or bot
 *   restart) and evaluate when entitlement is confirmed.
 * - free present while premium manages → leave via free proxy.
 */
const applyJoinRails = async (guildIds: Set<Snowflake>): Promise<void> => {
  for (const guildId of guildIds) {
    try {
      const active = await Services.Editions.getActiveEditions(guildId);

      if (active.has('premium')) {
        // getByGuildId throws on DB errors — never treat an error as "not entitled"
        const sub = await Services.Subscriptions.getByGuildId(guildId);

        if (sub && !isEntitledStatus(sub.status)) {
          logger.info(`Guild reconcile: premium bot leaving guild ${guildId} (not entitled)`);
          await Discord.leaveGuild('premium', guildId);
          continue;
        }

        if (active.has('free')) {
          if (!(await Services.Handover.isPending(guildId))) {
            logger.info(`Guild reconcile: restoring handover marker for guild ${guildId}`);
            await Services.Handover.setPending(guildId);
          }
          if (sub) {
            await Services.Handover.evaluate(guildId);
          }
          continue;
        }
      }

      if (
        active.has('free') &&
        (await Services.Editions.getManagingEdition(guildId)) === 'premium' &&
        // Belt and braces on top of the reconciled rows: never evict the free
        // bot unless the premium bot's membership is confirmed live
        (await Discord.isBotInGuild('premium', guildId))
      ) {
        logger.info(`Guild reconcile: free bot leaving guild ${guildId} (premium is managing)`);
        await Discord.leaveGuild('free', guildId);
      }
    } catch (error) {
      logger.warn(error, `Guild reconcile: join-rail check failed for guild ${guildId}`);
    }
  }
};

/**
 * Backstop for handover markers (missed events, crashed swaps): a marker is
 * only valid while BOTH presences are active — otherwise clear it. Valid
 * pending guilds are re-evaluated, so a handover whose permission-change ping
 * was missed (bot restart, failed HTTP call) still completes within a day.
 */
const sweepPendingMarkers = async (): Promise<void> => {
  const redis = Data.Drivers.Redis.PremiumPending;
  const prefix = `${Keys.PremiumPending}:`;
  let cursor = '0';
  let cleared = 0;

  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 500);
    cursor = next;

    for (const markerKey of keys) {
      const guildId = markerKey.slice(prefix.length);
      try {
        const active = await Services.Editions.getActiveEditions(guildId);
        if (!active.has('free') || !active.has('premium')) {
          await Services.Handover.clearPending(guildId);
          cleared++;
        } else {
          await Services.Handover.evaluate(guildId);
        }
      } catch (error) {
        logger.warn(error, `Guild reconcile: marker sweep failed for guild ${guildId}`);
      }
    }
  } while (cursor !== '0');

  if (cleared > 0) {
    logger.info(`Guild reconcile: cleared ${cleared} dangling handover markers`);
  }
};

/** Purge guilds whose last bot left more than 30 days ago (cascade + cache cleanup) */
const purgeAbandonedGuilds = async (): Promise<void> => {
  const purgeCutoff = new Date(Date.now() - PURGE_AFTER_MS);

  const toPurge = await db
    .select({ guildId: botPresence.guildId })
    .from(botPresence)
    .groupBy(botPresence.guildId)
    .having(
      sql`BOOL_OR(${botPresence.leftAt} IS NULL) = false AND MAX(${botPresence.leftAt}) < ${purgeCutoff}`
    );

  let purgedCount = 0;
  for (const row of toPurge) {
    if (await Services.Guilds.purge(row.guildId, purgeCutoff)) purgedCount++;
  }

  if (purgedCount > 0) {
    logger.info(`Guild reconcile: purged ${purgedCount} abandoned guilds`);
  }
};

const reconcileGuilds = async () => {
  const railCandidates = new Set<Snowflake>();
  let allSweepsCompleted = true;

  for (const edition of EDITIONS) {
    try {
      if (!Discord.hasToken(edition)) {
        // sweepEdition would skip anyway; track it so the rails stay off
        allSweepsCompleted = false;
      }
      for (const guildId of await sweepEdition(edition)) {
        railCandidates.add(guildId);
      }
    } catch (error) {
      allSweepsCompleted = false;
      logger.error(error, `Guild reconcile (${edition}) failed`);
      alerter.send(`guild-reconcile-failed:${edition}`, {
        title: 'Guild reconcile sweep aborted',
        description: `The ${edition} sweep failed before completion (pagination or DB error): ${error instanceof Error ? error.message : String(error)}. Presence rows for ${edition} were not reconciled today.`,
      });
    }
  }

  // Join rails need BOTH editions reconciled — deciding a leave against the
  // other edition's stale presence rows could evict the only working bot
  if (allSweepsCompleted) {
    // Dual-presence guilds are rail candidates even when untouched by the
    // sweeps: a crashed handover can leave both bots active with no marker
    for (const guildId of await getDualActiveGuildIds()) {
      railCandidates.add(guildId);
    }
    await applyJoinRails(railCandidates);
  } else if (railCandidates.size > 0) {
    logger.warn(
      `Guild reconcile: skipping join rails for ${railCandidates.size} guilds (a sweep did not complete)`
    );
  }

  await sweepPendingMarkers();
  await purgeAbandonedGuilds();
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
    alerter.send('guild-reconcile-failed', {
      title: 'Guild reconcile aborted',
      description: `Sweep failed before completion: ${error instanceof Error ? error.message : String(error)}. Guild presences were not reconciled today.`,
    });
  } finally {
    inFlight = false;
  }
};

export const startGuildReconcile = () => {
  const job = new CronJob('30 3 * * *', runGuildReconcile);
  job.start();
  logger.info('Guild reconcile cron started (daily at 03:30)');
};
