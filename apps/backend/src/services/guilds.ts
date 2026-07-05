import { config } from '@ap/config';
import { channel, db, guild } from '@ap/database';
import { createHttpError, HttpError, StatusCodes } from '@ap/express';
import { FilterMatchMode } from '@ap/validations';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import { and, eq, isNull, lt, notInArray, sql } from 'drizzle-orm';
import { logger } from 'utils/logger.js';

/**
 * Create or update guild in DB
 * @param guildId ID of the guild
 */
const ensureExists = async (guildId: Snowflake) => {
  try {
    await db.insert(guild).values({ guildId }).onConflictDoNothing();
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

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
 * Soft-delete guild (bot kicked/left): marks the row deleted, preserving all
 * channel config and cache entries so a re-invite restores everything.
 * Hard delete happens via the reconciliation purge after 30 days.
 * @param guildId ID of the guild
 */
const softDelete = async (guildId: Snowflake): Promise<void> => {
  try {
    // Only set once — keeps the original kick time so the purge window is stable
    await db
      .update(guild)
      .set({ deletedAt: new Date() })
      .where(and(eq(guild.guildId, guildId), isNull(guild.deletedAt)));

    logger.debug(`Soft-deleted guild ${guildId}`);
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to soft-delete guild');
  }
};

/**
 * Hard-delete a soft-deleted guild and all its associated channels from DB &
 * cache. Called by the reconciliation purge step only (30 days after soft
 * delete). The delete is guarded by the cutoff so a re-invite landing
 * mid-sweep wins: `registerNewGuild` clears `deletedAt`, the conditional
 * delete then matches nothing, and the restored config survives.
 * @param guildId ID of the guild
 * @param cutoff purge threshold; only rows soft-deleted before it are removed
 * @returns true if the guild was purged, false if it was restored mid-sweep
 */
const purge = async (guildId: Snowflake, cutoff: Date): Promise<boolean> => {
  try {
    // Channel IDs must be read before the delete — the FK cascade removes the rows
    const channelIds = await getChannels(guildId);

    const deleted = await db
      .delete(guild)
      .where(and(eq(guild.guildId, guildId), lt(guild.deletedAt, cutoff)))
      .returning({ guildId: guild.guildId });

    if (deleted.length === 0) {
      logger.info(`Purge skipped for guild ${guildId}: restored mid-sweep`);
      return false;
    }

    // Channel rows cascaded with the guild row; clear the derived Redis state
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
 * Register guild on join (guildCreate): new guilds start migrated; a re-invited
 * guild only gets its soft delete cleared — `migratedAt` is preserved, so a
 * kicked legacy guild returns as legacy. When the live announcement-channel
 * list is provided, config for channels deleted while the bot was away is
 * pruned before the cache rebuild.
 * @param guildId ID of the guild
 * @param announcementChannelIds live announcement channels from the GUILD_CREATE payload
 */
const registerNewGuild = async (
  guildId: Snowflake,
  announcementChannelIds?: Snowflake[]
): Promise<void> => {
  try {
    const rows = await db
      .insert(guild)
      .values({ guildId, migratedAt: new Date() })
      .onConflictDoUpdate({ target: guild.guildId, set: { deletedAt: null } })
      .returning({ migratedAt: guild.migratedAt });

    if (announcementChannelIds) {
      await pruneStaleChannels(guildId, announcementChannelIds);
    }

    // Rebuild derived cache only for migrated guilds — a restored legacy guild
    // must stay legacy. Full sync (entries first, marker last) rather than a
    // bare marker write: a re-invited guild must get its channel entries back
    // even if Redis lost them while the guild was soft-deleted.
    // MIGRATION: After transition (6 months), remove the sync call
    if (rows[0]?.migratedAt) {
      await syncMigratedGuildCache(guildId);
    }

    logger.debug(`Registered guild ${guildId} in DB and cache`);
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

    if (
      config.limits.channelsPerGuild !== 0 &&
      channelIds.length > config.limits.channelsPerGuild
    ) {
      throw createHttpError('Guild has reached the channels limit', StatusCodes.BAD_REQUEST);
    }

    await db.transaction(async tx => {
      await tx
        .insert(guild)
        .values({ guildId, migratedAt: new Date() })
        .onConflictDoUpdate({
          target: guild.guildId,
          set: { migratedAt: sql`COALESCE(${guild.migratedAt}, now())`, deletedAt: null },
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
  ensureExists,
  find,
  getChannels,
  getChannelRecords,
  softDelete,
  purge,
  registerNewGuild,
  migrate,
  syncMigratedGuildCache,
};
