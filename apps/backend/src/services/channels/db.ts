import { db } from '@ap/database';
import type { Filter } from '@ap/validations';
import type { Snowflake } from 'discord-api-types/globals';
import { ChannelsCache } from 'services/redis.js';
import { logger } from 'utils/logger.js';

/**
 * Get channel from DB
 * @param channelId ID of the channel
 * @returns Channel record or null if not found
 */
const find = async (channelId: Snowflake) => {
  return await db.channels.findUnique({
    where: { channelId },
  });
};

/**
 * Get channel from cache
 * @param channelId ID of the channel
 * @returns Channel ID or null if not found
 */
const findCached = async (channelId: Snowflake) => {
  return await ChannelsCache.get(channelId);
};

/**
 * Add channel to channels DB & cache
 * @param channelId ID of the channel
 * @returns Channel ID
 */
const create = async (guildId: Snowflake, channelId: Snowflake) => {
  let dbCreated = false;

  try {
    await db.channels.create({
      data: {
        channelId,
        guildId,
        filters: [],
      },
    });
    dbCreated = true;
    await ChannelsCache.set(channelId, []);
  } catch (error) {
    // If DB creation succeeded but cache failed, rollback DB
    if (dbCreated) {
      await db.channels.deleteMany({ where: { channelId, guildId } }).catch(() => {});
    }
    logger.error(error);
    throw error;
  }
  return channelId;
};

/**
 * Remove channel from channels DB & cache
 * @param channelId ID of the channel
 * @returns Channel ID
 */
const remove = async (channelId: Snowflake) => {
  let dbDeleted = false;

  try {
    await db.channels.deleteMany({ where: { channelId } });
    dbDeleted = true;
    await ChannelsCache.remove(channelId);
  } catch (error) {
    // If DB deletion succeeded but cache removal failed, retry cache removal
    if (dbDeleted) {
      await ChannelsCache.remove(channelId).catch(() => {});
    }
    logger.error(error);
    throw error;
  }
  return channelId;
};

/**
 * Remove all channels for a guild from DB & cache
 * Uses a single deleteMany query for efficiency
 * @param guildId ID of the guild
 * @returns Array of removed channel IDs
 */
const removeByGuildId = async (guildId: Snowflake) => {
  try {
    // First, get all channel IDs for this guild to remove from cache
    const guildChannels = await db.channels.findMany({
      where: { guildId },
      select: { channelId: true },
    });

    const channelIds = guildChannels.map(c => c.channelId);

    // Delete all channels for this guild in a single query
    await db.channels.deleteMany({
      where: { guildId },
    });

    // Remove all channels from cache in a single operation
    if (channelIds.length > 0) {
      await ChannelsCache.removeMany(channelIds);
    }

    return channelIds;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

/**
 * Get size of the channels cache
 * @returns Size of the cache
 */
const getSize = async () => {
  return ChannelsCache.getSize();
};

/**
 * Get count of channels by guild ID
 * @param guildId ID of the guild
 * @returns Number of channels in the guild
 */
const countByGuild = async (guildId: Snowflake) => {
  return await db.channels.count({
    where: { guildId },
  });
};

/**
 * Add filter to channel
 * @param channelId ID of the channel
 * @param filter Filter data
 * @returns void
 */
const addFilter = async (channelId: Snowflake, filter: Filter) => {
  const channel = await db.channels.findUnique({
    where: { channelId },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  const updatedFilters = [...channel.filters, filter];
  let dbUpdated = false;

  try {
    await db.channels.update({
      where: { channelId },
      data: {
        filters: updatedFilters,
      },
    });
    dbUpdated = true;
    await ChannelsCache.updateFilters(channelId, updatedFilters);
  } catch (error) {
    // If DB update succeeded but cache update failed, rollback DB
    if (dbUpdated) {
      await db.channels
        .update({
          where: { channelId },
          data: { filters: channel.filters },
        })
        .catch(() => {});
    }
    logger.error(error);
    throw error;
  }
};

/**
 * Remove filter from channel
 * @param channelId ID of the channel
 * @param filterId ID of the filter
 * @returns void
 */
const removeFilter = async (channelId: Snowflake, filterId: string) => {
  const channel = await db.channels.findUnique({
    where: { channelId },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  const updatedFilters = channel.filters.filter(f => f.id !== filterId);
  let dbUpdated = false;

  try {
    await db.channels.update({
      where: { channelId },
      data: {
        filters: updatedFilters,
      },
    });
    dbUpdated = true;
    await ChannelsCache.updateFilters(channelId, updatedFilters);
  } catch (error) {
    // If DB update succeeded but cache update failed, rollback DB
    if (dbUpdated) {
      await db.channels
        .update({
          where: { channelId },
          data: { filters: channel.filters },
        })
        .catch(() => {});
    }
    logger.error(error);
    throw error;
  }
};

/**
 * Update filter in channel
 * @param channelId ID of the channel
 * @param filterId ID of the filter
 * @param filterData Updated filter data
 * @returns void
 */
const updateFilter = async (
  channelId: Snowflake,
  filterId: string,
  filterData: Partial<Omit<Filter, 'id' | 'createdAt'>>
) => {
  const channel = await db.channels.findUnique({
    where: { channelId },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  const filterIndex = channel.filters.findIndex(f => f.id === filterId);

  const existingFilter = channel.filters[filterIndex];

  if (!existingFilter) {
    throw new Error('Filter not found');
  }

  const updatedFilters = [...channel.filters];
  updatedFilters[filterIndex] = {
    id: existingFilter.id,
    type: filterData.type ?? existingFilter.type,
    mode: filterData.mode ?? existingFilter.mode,
    values: filterData.values ?? existingFilter.values,
    createdAt: existingFilter.createdAt,
  };

  let dbUpdated = false;

  try {
    await db.channels.update({
      where: { channelId },
      data: {
        filters: updatedFilters,
      },
    });
    dbUpdated = true;
    await ChannelsCache.updateFilters(channelId, updatedFilters);
  } catch (error) {
    // If DB update succeeded but cache update failed, rollback DB
    if (dbUpdated) {
      await db.channels
        .update({
          where: { channelId },
          data: { filters: channel.filters },
        })
        .catch(() => {});
    }
    logger.error(error);
    throw error;
  }
};

/**
 * Update filter mode for channel
 * @param channelId ID of the channel
 * @param mode Filter mode ('any' or 'all')
 * @returns void
 */
const updateFilterMode = async (channelId: Snowflake, mode: 'any' | 'all') => {
  const channel = await db.channels.findUnique({
    where: { channelId },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  let dbUpdated = false;

  try {
    await db.channels.update({
      where: { channelId },
      data: {
        filterMode: mode,
      },
    });
    dbUpdated = true;
    // Note: Redis cache doesn't store filterMode separately, it's fetched from DB
    await ChannelsCache.set(channelId, channel.filters);
  } catch (error) {
    // If DB update succeeded but cache update failed, rollback DB
    if (dbUpdated) {
      await db.channels
        .update({
          where: { channelId },
          data: { filterMode: channel.filterMode },
        })
        .catch(() => {});
    }
    logger.error(error);
    throw error;
  }
};

/**
 * Sync all channels from DB to cache by comparing and updating differences
 * @returns void
 */
const syncCache = async () => {
  try {
    logger.info('Starting cache sync with DB');

    // Get channels from both DB and cache
    const [dbChannels, cachedChannelIds] = await Promise.all([
      db.channels.findMany({
        select: { channelId: true, filters: true },
      }),
      ChannelsCache.getAll(),
    ]);

    const dbChannelIds = new Set(dbChannels.map(c => c.channelId));
    const cacheChannelIds = new Set(cachedChannelIds);

    // Find channels to add to cache (in DB but not in cache)
    const channelsToAdd = dbChannels.filter(c => !cacheChannelIds.has(c.channelId));

    // Find channels to remove from cache (in cache but not in DB)
    const channelsToRemove = [...cacheChannelIds].filter(id => !dbChannelIds.has(id));

    // Add missing channels to cache with filters
    if (channelsToAdd.length > 0) {
      for (const channel of channelsToAdd) {
        await ChannelsCache.set(channel.channelId, channel.filters);
      }
      logger.info(`Added ${channelsToAdd.length} channels to cache`);
    }

    // Remove extra channels from cache
    if (channelsToRemove.length > 0) {
      await ChannelsCache.removeMany(channelsToRemove);
      logger.info(`Removed ${channelsToRemove.length} channels from cache`);
    }

    if (channelsToAdd.length === 0 && channelsToRemove.length === 0) {
      logger.debug('Cache and DB are in sync');
    } else {
      logger.info(
        `Cache sync completed: added ${channelsToAdd.length}, removed ${channelsToRemove.length}`
      );
    }
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

export const DB = {
  find,
  findCached,
  create,
  remove,
  removeByGuildId,
  getSize,
  countByGuild,
  addFilter,
  removeFilter,
  updateFilter,
  updateFilterMode,
  syncCache,
};
