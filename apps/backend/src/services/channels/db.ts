import { db } from '@ap/database';
import type { Filter } from '@ap/validations';
import type { Snowflake } from 'discord-api-types/globals';
import { Services } from 'services/index.js';
import { ChannelsCache } from 'services/redis.js';

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
  try {
    await db.channels.create({
      data: {
        channelId,
        guildId,
        filters: [],
      },
    });
    await ChannelsCache.set(channelId, []);
  } catch (error) {
    // Attempt to rollback both DB and cache
    await db.channels.deleteMany({ where: { channelId, guildId } }).catch(() => {});
    await ChannelsCache.remove(channelId).catch(() => {});
    Services.Logger.error(error);
  }
  return channelId;
};

/**
 * Remove channel from channels DB & cache
 * @param channelId ID of the channel
 * @returns Channel ID
 */
const remove = async (channelId: Snowflake) => {
  try {
    await db.channels.deleteMany({ where: { channelId } });
    await ChannelsCache.remove(channelId);
  } catch (error) {
    // Attempt to rollback the cache
    await ChannelsCache.set(channelId, []).catch(() => {});
    Services.Logger.error(error);
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
    Services.Logger.error(error);
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
  try {
    const channel = await db.channels.findUnique({
      where: { channelId },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    await db.channels.update({
      where: { channelId },
      data: {
        filters: [...channel.filters, filter],
      },
    });

    await ChannelsCache.updateFilters(channelId, [...channel.filters, filter]);
  } catch (error) {
    Services.Logger.error(error);
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
  try {
    const channel = await db.channels.findUnique({
      where: { channelId },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    const updatedFilters = channel.filters.filter((f: Filter) => f.id !== filterId);

    await db.channels.update({
      where: { channelId },
      data: {
        filters: updatedFilters,
      },
    });

    await ChannelsCache.updateFilters(channelId, updatedFilters);
  } catch (error) {
    Services.Logger.error(error);
    throw error;
  }
};

/**
 * Sync all channels from DB to cache by comparing and updating differences
 * @returns void
 */
const syncCache = async () => {
  try {
    Services.Logger.info('Starting cache sync with DB');

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
      Services.Logger.info(`Added ${channelsToAdd.length} channels to cache`);
    }

    // Remove extra channels from cache
    if (channelsToRemove.length > 0) {
      await ChannelsCache.removeMany(channelsToRemove);
      Services.Logger.info(`Removed ${channelsToRemove.length} channels from cache`);
    }

    if (channelsToAdd.length === 0 && channelsToRemove.length === 0) {
      Services.Logger.debug('Cache and DB are in sync');
    } else {
      Services.Logger.info(
        `Cache sync completed: added ${channelsToAdd.length}, removed ${channelsToRemove.length}`
      );
    }
  } catch (error) {
    Services.Logger.error(error);
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
  syncCache,
};
