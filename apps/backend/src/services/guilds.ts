import type { Edition } from '@ap/api-types';
import { botPresence, channel, db, guild } from '@ap/database';
import { createHttpError, HttpError, StatusCodes } from '@ap/express';
import { FilterMatchMode } from '@ap/validations';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import { and, eq, isNull, lt, max, notExists, notInArray, sql } from 'drizzle-orm';
import { logger } from 'utils/logger.js';
import { Discord } from './discord.js';
import { Editions } from './editions.js';
import { Handover } from './handover.js';
import { isEntitledStatus, Subscriptions } from './subscriptions.js';

/**
 * Get guild row from DB
 * @param guildId ID of the guild
 * @returns Guild record or null if not found
 */
const find = async (guildId: Snowflake) => {
  try {
    const result = await db.select().from(guild).where(eq(guild.guildId, guildId)).limit(1);
    return result[0] ?? null;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve guild');
  }
};

/**
 * Get all channels for a guild from DB
 * @param guildId ID of the guild
 * @returns Array of channel IDs
 */
const getChannels = async (guildId: Snowflake): Promise<string[]> => {
  try {
    const rows = await db
      .select({ channelId: channel.channelId })
      .from(channel)
      .where(eq(channel.guildId, guildId));

    const channelIds = rows.map(r => r.channelId);

    logger.debug(`Retrieved ${channelIds.length} channels for guild ${guildId}`);

    return channelIds;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve channels');
  }
};

/**
 * Mark an edition's bot as no longer in the guild (kick/leave): guild config
 * and cache entries are preserved so a re-invite restores everything. Hard
 * delete happens via the reconciliation purge once no edition has an active
 * presence for 30 days. Any pending handover is cleared: free bot gone →
 * premium activates immediately (its latch reads the absent marker); premium
 * bot gone → free continues unchanged.
 * @param guildId ID of the guild
 * @param edition edition of the bot that left
 */
const softDelete = async (guildId: Snowflake, edition: Edition): Promise<void> => {
  try {
    // Only set once — keeps the original kick time so the purge window is stable
    await db
      .update(botPresence)
      .set({ leftAt: new Date() })
      .where(
        and(
          eq(botPresence.guildId, guildId),
          eq(botPresence.edition, edition),
          isNull(botPresence.leftAt)
        )
      );

    await Handover.clearPending(guildId);

    logger.debug(`Soft-deleted ${edition} presence for guild ${guildId}`);
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to soft-delete guild presence');
  }
};

/**
 * Hard-delete a guild with no active bot presences from DB & cache (presence
 * and channel rows cascade). Called by the reconciliation purge step only
 * (30 days after the last bot left). The delete is guarded by the cutoff and
 * the no-active-presence condition so a re-invite landing mid-sweep wins:
 * `registerNewGuild` reactivates a presence, the conditional delete then
 * matches nothing, and the restored config survives.
 * @param guildId ID of the guild
 * @param cutoff purge threshold; only guilds whose newest leftAt predates it are removed
 * @returns true if the guild was purged, false if it was restored mid-sweep
 */
const purge = async (guildId: Snowflake, cutoff: Date): Promise<boolean> => {
  try {
    // Channel IDs must be read before the delete — the FK cascade removes the rows
    const channelIds = await getChannels(guildId);

    const noActivePresence = notExists(
      db
        .select({ one: sql`1` })
        .from(botPresence)
        .where(and(eq(botPresence.guildId, guild.guildId), isNull(botPresence.leftAt)))
    );
    // ISO string, not the Date: subquery/aggregate comparisons drop the
    // column's param mapper, so a raw Date reaches the driver and throws
    const newestLeftAtBeforeCutoff = lt(
      db
        .select({ value: max(botPresence.leftAt) })
        .from(botPresence)
        .where(eq(botPresence.guildId, guild.guildId)),
      cutoff.toISOString()
    );

    const deleted = await db
      .delete(guild)
      .where(and(eq(guild.guildId, guildId), noActivePresence, newestLeftAtBeforeCutoff))
      .returning({ guildId: guild.guildId });

    if (deleted.length === 0) {
      logger.info(`Purge skipped for guild ${guildId}: restored mid-sweep`);
      return false;
    }

    // Channel + presence rows cascaded with the guild row; clear derived Redis state
    if (channelIds.length > 0) {
      await Data.Channels.Cache.removeMany(channelIds);
    }
    // MIGRATION: After transition (6 months), remove the marker delete
    await Data.Drivers.Redis.MigratedGuilds.del(`migrated_guild:${guildId}`);

    logger.debug(`Purged guild ${guildId} and ${channelIds.length} associated channels`);
    return true;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to purge guild');
  }
};

/**
 * Delete channel config (DB rows + Redis entries) for channels no longer in
 * the guild's live announcement-channel list — channels deleted while the bot
 * was kicked or down never fire channelDelete, and stale rows count against
 * the free-plan channel limit with no dashboard toggle to free them.
 * @param guildId ID of the guild
 * @param liveChannelIds the guild's current announcement channel IDs
 */
const pruneStaleChannels = async (
  guildId: Snowflake,
  liveChannelIds: Snowflake[]
): Promise<void> => {
  const staleFilter =
    liveChannelIds.length > 0
      ? and(eq(channel.guildId, guildId), notInArray(channel.channelId, liveChannelIds))
      : eq(channel.guildId, guildId);

  const stale = await db
    .delete(channel)
    .where(staleFilter)
    .returning({ channelId: channel.channelId });

  if (stale.length > 0) {
    await Data.Channels.Cache.removeMany(stale.map(s => s.channelId));
    logger.info(`Pruned ${stale.length} stale channels for guild ${guildId}`);
  }
};

/**
 * Upsert a bot presence as active. A re-invite gets a fresh joinedAt; a
 * duplicate registration while already active keeps the original one (the
 * reconciliation join-race guard keys off joinedAt).
 */
const activatePresence = async (guildId: Snowflake, edition: Edition): Promise<void> => {
  await db
    .insert(botPresence)
    .values({ guildId, edition, joinedAt: new Date() })
    .onConflictDoUpdate({
      target: [botPresence.guildId, botPresence.edition],
      set: {
        joinedAt: sql`CASE WHEN ${botPresence.leftAt} IS NULL THEN ${botPresence.joinedAt} ELSE now() END`,
        leftAt: null,
      },
    });
};

/**
 * Register a bot joining a guild (guildCreate): upsert the guild row (new
 * guilds start migrated; a re-invited guild keeps its `migratedAt`, so a
 * kicked legacy guild returns as legacy), activate the edition's presence,
 * prune config for channels deleted while no bot was watching, and rebuild the
 * derived cache. Then edition orchestration (ADR 0006):
 * - premium not entitled → leave via the premium proxy (backend owns the gate)
 * - premium while free present → mark handover pending, evaluate (may swap)
 * - free while premium is managing → leave via the free proxy
 * @param guildId ID of the guild
 * @param edition edition of the bot that joined
 * @param announcementChannelIds live announcement channels from the GUILD_CREATE payload
 */
const registerNewGuild = async (
  guildId: Snowflake,
  edition: Edition,
  announcementChannelIds?: Snowflake[]
): Promise<void> => {
  try {
    if (edition === 'premium') {
      // Entitlement gate. getByGuildId throws on DB errors (unlike isEntitled,
      // which would swallow them into "not entitled") — a DB hiccup must
      // surface as a 500 to the bot, never as a leave.
      const sub = await Subscriptions.getByGuildId(guildId);
      if (!(sub && isEntitledStatus(sub.status))) {
        // Nothing is written — the leave triggers the premium bot's
        // guildDelete, and there is no presence row to soft-delete
        logger.info(`Premium bot leaving guild ${guildId}: not entitled`);
        await Discord.leaveGuild('premium', guildId);
        return;
      }
    }

    // Must be read before activating our own presence
    const freeActive = edition === 'premium' ? await Editions.isBotPresent(guildId, 'free') : false;

    const rows = await db
      .insert(guild)
      .values({ guildId, migratedAt: new Date() })
      .onConflictDoUpdate({ target: guild.guildId, set: { updatedAt: new Date() } })
      .returning({ migratedAt: guild.migratedAt });

    if (edition === 'premium' && freeActive) {
      // The marker must exist before this call returns: the premium bot's hot
      // path holds messages behind an in-flight-registration gate until the
      // register response lands, then latches "active" on its first
      // absent-marker read — a marker written any later would lose the race
      await Handover.setPending(guildId);
    }

    await activatePresence(guildId, edition);

    if (announcementChannelIds) {
      await pruneStaleChannels(guildId, announcementChannelIds);
    }

    // Rebuild derived cache only for migrated guilds — a restored legacy guild
    // must stay legacy. Full sync (entries first, marker last) rather than a
    // bare marker write: a re-invited guild must get its channel entries back
    // even if Redis lost them while the guild had no bot.
    // MIGRATION: After transition (6 months), remove the sync call
    if (rows[0]?.migratedAt) {
      await syncMigratedGuildCache(guildId);
    }

    if (edition === 'premium' && freeActive) {
      // Gated handover: premium idles behind the marker (set above) until it
      // can publish everywhere the free bot does; permissions may already
      // suffice, so evaluate immediately
      await Handover.evaluate(guildId);
    } else if (edition === 'free' && (await Editions.getManagingEdition(guildId)) === 'premium') {
      // Free re-invited while premium is active and managing — no permission
      // gap concern (premium already covers); leave again immediately. The
      // premium presence row can be stale (missed guildDelete), so confirm
      // live membership first: never leave a guild with zero bots.
      if (await Discord.isBotInGuild('premium', guildId)) {
        logger.info(`Free bot leaving guild ${guildId}: premium is managing`);
        await Discord.leaveGuild('free', guildId);
      } else {
        logger.warn(
          `Free bot staying in guild ${guildId}: premium presence row is stale (reconcile will repair)`
        );
      }
    }

    logger.debug(`Registered ${edition} presence for guild ${guildId} in DB and cache`);
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to register new guild');
  }
};

/**
 * Rebuild the derived Redis state for a migrated guild from DB: channel cache
 * entries first, `MigratedGuilds` marker last (the marker is the behavioral
 * commit point — until it is set the bot treats the guild as fully legacy).
 * Idempotent; startup cache-sync is the crash backstop.
 * @param guildId ID of the guild
 */
const syncMigratedGuildCache = async (guildId: Snowflake): Promise<void> => {
  const records = await getChannelRecords(guildId);

  if (records.length > 0) {
    await Data.Channels.Cache.setMany(
      records.map(r => ({
        channelId: r.channelId,
        filters: r.filters,
        filterMode: (r.filterMode as FilterMatchMode) || FilterMatchMode.Any,
      }))
    );
  }

  await Data.Drivers.Redis.MigratedGuilds.set(`migrated_guild:${guildId}`, '1');
};

/**
 * Migrate a legacy guild to the allowlist model: one authoritative DB
 * transaction (channel rows + `migratedAt`), then derived cache sync.
 * Every partial state before the marker lands is behavior-preserving (guild
 * stays fully legacy), so no compensating rollbacks are needed.
 * MIGRATION: After transition (6 months), remove this function entirely
 * @param guildId ID of the guild
 * @param channelIds Channels to enable (may be empty)
 */
const migrate = async (guildId: Snowflake, channelIds: Snowflake[]): Promise<void> => {
  try {
    const existing = await db
      .select({ migratedAt: guild.migratedAt })
      .from(guild)
      .where(eq(guild.guildId, guildId))
      .limit(1);

    if (existing[0]?.migratedAt) {
      throw createHttpError('Guild is already migrated', StatusCodes.CONFLICT);
    }

    const { limit, reason } = await Editions.resolveChannelLimit(guildId);
    if (limit !== 0 && channelIds.length > limit) {
      throw createHttpError(
        'Guild has reached the channels limit',
        StatusCodes.BAD_REQUEST,
        reason
      );
    }

    await db.transaction(async tx => {
      await tx
        .insert(guild)
        .values({ guildId, migratedAt: new Date() })
        .onConflictDoUpdate({
          target: guild.guildId,
          set: { migratedAt: sql`COALESCE(${guild.migratedAt}, now())` },
        });

      if (channelIds.length > 0) {
        await tx
          .insert(channel)
          .values(channelIds.map(channelId => ({ channelId, guildId, filters: [] })))
          .onConflictDoNothing();
      }
    });

    // Derived cache; a failure here leaves the guild behaviorally legacy until
    // the retry or the next startup sync — never a broken in-between state
    try {
      await syncMigratedGuildCache(guildId);
    } catch {
      await syncMigratedGuildCache(guildId).catch(error =>
        logger.error(
          error,
          `Cache sync failed after migrating guild ${guildId}; startup sync will repair`
        )
      );
    }

    logger.debug(`Migrated guild ${guildId} with ${channelIds.length} channels`);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    logger.error(error);
    throw new Error('Failed to migrate guild');
  }
};

/**
 * Get full channel records for a guild from DB (with filters, filterMode)
 * @param guildId ID of the guild
 */
const getChannelRecords = async (guildId: Snowflake) => {
  try {
    const rows = await db
      .select({
        channelId: channel.channelId,
        filters: channel.filters,
        filterMode: channel.filterMode,
      })
      .from(channel)
      .where(eq(channel.guildId, guildId));

    logger.debug(`Retrieved ${rows.length} channel records for guild ${guildId}`);

    return rows;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve channel records');
  }
};

export const Guilds = {
  find,
  getChannels,
  getChannelRecords,
  softDelete,
  purge,
  activatePresence,
  registerNewGuild,
  migrate,
  syncMigratedGuildCache,
};
