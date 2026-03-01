import { config } from '@ap/config';
import { channel as channelTable, db, guild } from '@ap/database';
import { createHttpError, HttpError, StatusCodes } from '@ap/express';
import { FilterMatchMode } from '@ap/validations';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import { asc, count, eq, gt } from 'drizzle-orm';
import { logger } from 'utils/logger.js';
import { Filters } from './filters.js';

/**
 * Initialize channels cache from DB
 * Syncs all channels from DB to cache using cursor-based pagination
 */
const initialize = async () => {
  try {
    const BATCH_SIZE = 5000;
    let cursor: string | undefined;
    let syncedCount = 0;

    logger.info('Starting cache sync with DB');

    // Phase 1: Sync DB → cache (cursor-based batching)
    while (true) {
      const batch = await db
        .select({
          id: channelTable.id,
          channelId: channelTable.channelId,
          filters: channelTable.filters,
          filterMode: channelTable.filterMode,
        })
        .from(channelTable)
        .where(cursor ? gt(channelTable.id, cursor) : undefined)
        .orderBy(asc(channelTable.id))
        .limit(BATCH_SIZE);

      if (batch.length === 0) break;

      // Bulk insert to cache
      await Data.Channels.Cache.setMany(
        batch.map(c => ({
          channelId: c.channelId,
          filters: c.filters,
          filterMode: c.filterMode || FilterMatchMode.Any,
        }))
      );

      syncedCount += batch.length;
      cursor = batch[batch.length - 1]?.id;

      // Progress logging every 10k
      if (syncedCount % 10000 === 0) {
        logger.info(`Cache sync progress: ${syncedCount} channels`);
      }

      // Yield to event loop (prevent blocking)
      await new Promise(resolve => setImmediate(resolve));
    }

    logger.info(`Phase 1 complete: synced ${syncedCount} channels`);

    // MIGRATION: Phase 2 - Cache migrated guild IDs from guild table
    // TODO: Remove this block after migration period (6 months)
    logger.info('Phase 2: Syncing migrated guilds to cache');
    const migratedGuilds = await db.select({ guildId: guild.guildId }).from(guild);

    if (migratedGuilds.length > 0) {
      const pipeline = Data.Drivers.Redis.MigratedGuilds.multi();
      for (const g of migratedGuilds) {
        pipeline.set(`migrated_guild:${g.guildId}`, '1');
      }
      await pipeline.exec();
      logger.info(`Phase 2 complete: cached ${migratedGuilds.length} migrated guilds`);
    }

    // Phase 3: Remove stale cache entries (channels deleted during downtime)
    const cachedIds = await Data.Channels.Cache.getAll();

    // Batch DB query for existence check
    const dbChannelIds = new Set<string>();
    let dbCursor: string | undefined;

    while (true) {
      const dbBatch = await db
        .select({ id: channelTable.id, channelId: channelTable.channelId })
        .from(channelTable)
        .where(dbCursor ? gt(channelTable.id, dbCursor) : undefined)
        .orderBy(asc(channelTable.id))
        .limit(BATCH_SIZE);

      if (dbBatch.length === 0) break;

      for (const ch of dbBatch) {
        dbChannelIds.add(ch.channelId);
      }

      dbCursor = dbBatch[dbBatch.length - 1]?.id;
      await new Promise(resolve => setImmediate(resolve));
    }

    const stale = cachedIds.filter(id => !dbChannelIds.has(id));

    if (stale.length > 0) {
      await Data.Channels.Cache.removeMany(stale);
      logger.info(`Removed ${stale.length} stale channels from cache`);
    }

    logger.info('Cache sync complete');
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

/**
 * Get channel from DB
 * @param channelId ID of the channel
 * @returns Channel record or null if not found
 */
const find = async (channelId: Snowflake) => {
  const result = await db
    .select()
    .from(channelTable)
    .where(eq(channelTable.channelId, channelId))
    .limit(1);
  return result[0] ?? null;
};

/**
 * Get channel from cache with DB fallback and self-healing
 * @param channelId ID of the channel
 * @returns Channel data with filters and filterMode, or null if not found
 */
const get = async (channelId: Snowflake) => {
  try {
    // Fast path: Check cache first (0.15ms vs 10-50ms DB query)
    const cached = await Data.Channels.Cache.get(channelId);

    if (cached) {
      // Cache hit - return immediately
      return {
        enabled: true,
        channelId,
        filters: cached.filters || [],
        filterMode: cached.filterMode || FilterMatchMode.Any,
      };
    }

    // Cache miss - fallback to DB
    const dbChannel = await find(channelId);

    if (dbChannel) {
      // Repair cache
      await Data.Channels.Cache.set(
        channelId,
        dbChannel.filters || [],
        (dbChannel.filterMode as FilterMatchMode) || FilterMatchMode.Any
      );

      return {
        enabled: true,
        channelId,
        filters: dbChannel.filters || [],
        filterMode: dbChannel.filterMode || FilterMatchMode.Any,
      };
    }

    // Not enabled
    return null;
  } catch (error) {
    logger.error(error);
    return null;
  }
};

/**
 * Add channel to channel DB & cache
 * @param guildId ID of the guild
 * @param channelId ID of the channel
 */
const add = async (guildId: Snowflake, channelId: Snowflake): Promise<void> => {
  // Check if channel already exists
  const existingChannel = await get(channelId);
  if (existingChannel) {
    throw createHttpError('Channel already exists', StatusCodes.CONFLICT);
  }

  // Check if guild has hit the channels limit
  const countResult = await db
    .select({ count: count() })
    .from(channelTable)
    .where(eq(channelTable.guildId, guildId));
  const guildChannelsCount = countResult[0]?.count ?? 0;

  if (
    config.limits.channelsPerGuild !== 0 &&
    guildChannelsCount >= config.limits.channelsPerGuild
  ) {
    throw createHttpError('Guild has reached the channels limit', StatusCodes.BAD_REQUEST);
  }

  let dbCreated = false;

  try {
    // Ensure guild exists before adding channel
    await db.insert(guild).values({ guildId }).onConflictDoNothing();

    await db.insert(channelTable).values({ channelId, guildId, filters: [] });
    dbCreated = true;
    await Data.Channels.Cache.set(channelId, [], FilterMatchMode.Any);

    // MIGRATION: Mark guild as migrated (first channel enable)
    // TODO: Remove this call after migration period (6 months)
    await Data.Drivers.Redis.MigratedGuilds.set(`migrated_guild:${guildId}`, '1');

    logger.debug(`Added channel ${channelId} for guild ${guildId}`);
  } catch (error) {
    // If DB creation succeeded but cache failed, rollback DB
    if (dbCreated) {
      await db
        .delete(channelTable)
        .where(eq(channelTable.channelId, channelId))
        .catch(() => {});
    }
    logger.error(error);
    throw new Error('Failed to add channel');
  }
};

/**
 * Remove channel from channel DB & cache
 * @param channelId ID of the channel
 */
const remove = async (channelId: Snowflake): Promise<void> => {
  let dbDeleted = false;

  try {
    await db.delete(channelTable).where(eq(channelTable.channelId, channelId));
    dbDeleted = true;
    await Data.Channels.Cache.remove(channelId);

    logger.debug(`Removed channel ${channelId}`);
  } catch (error) {
    // If DB deletion succeeded but cache removal failed, retry cache removal
    if (dbDeleted) {
      await Data.Channels.Cache.remove(channelId).catch(() => {});
    }
    logger.error(error);
    throw new Error('Failed to remove channel');
  }
};

/**
 * Remove all channels for a guild from DB & cache
 * Uses a single delete query for efficiency
 * @param guildId ID of the guild
 * @returns Array of removed channel IDs
 */
const removeByGuildId = async (guildId: Snowflake) => {
  try {
    // First, get all channel IDs for this guild to remove from cache
    const guildChannels = await db
      .select({ channelId: channelTable.channelId })
      .from(channelTable)
      .where(eq(channelTable.guildId, guildId));

    // Delete all channels for this guild in a single query
    await db.delete(channelTable).where(eq(channelTable.guildId, guildId));

    const channelIds = guildChannels.map(c => c.channelId);

    // Remove all channels from cache in a single operation
    if (channelIds.length > 0) {
      await Data.Channels.Cache.removeMany(channelIds);
    }

    return channelIds;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

/**
 * Get count of channels by guild ID
 * @param guildId ID of the guild
 * @returns Number of channels in the guild
 */
const countByGuild = async (guildId: Snowflake) => {
  const result = await db
    .select({ count: count() })
    .from(channelTable)
    .where(eq(channelTable.guildId, guildId));
  return result[0]?.count ?? 0;
};

/**
 * Set filter mode for channel
 * @param channelId ID of the channel
 * @param mode Filter mode (FilterMatchMode.Any or 'all')
 */
const setFilterMode = async (channelId: Snowflake, mode: FilterMatchMode): Promise<void> => {
  try {
    // Check if channel exists
    const ch = await find(channelId);

    if (!ch) {
      throw createHttpError('Channel not found', StatusCodes.NOT_FOUND);
    }

    let dbUpdated = false;

    try {
      await db
        .update(channelTable)
        .set({ filterMode: mode })
        .where(eq(channelTable.channelId, channelId));
      dbUpdated = true;
      await Data.Channels.Cache.updateFilters(channelId, ch.filters, mode);

      logger.debug(`Updated filter mode for channel ${channelId} to ${mode}`);
    } catch (error) {
      // If DB update succeeded but cache update failed, rollback DB
      if (dbUpdated) {
        await db
          .update(channelTable)
          .set({ filterMode: ch.filterMode })
          .where(eq(channelTable.channelId, channelId))
          .catch(() => {});
      }
      logger.error(error);
      throw error;
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    logger.error(error);
    throw new Error('Failed to update filter mode');
  }
};

/**
 * Get size of the channels cache
 * @returns Size of the cache
 */
const getSize = async () => {
  return Data.Channels.Cache.getSize();
};

export const Channels = {
  initialize,
  find,
  get,
  add,
  remove,
  removeByGuildId,
  countByGuild,
  setFilterMode,
  getSize,
  Filters,
};
