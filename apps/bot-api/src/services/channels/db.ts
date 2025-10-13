import { db } from '@ap/database';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import { Services } from 'services/index.js';

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
  return await Data.Repo.ChannelsCache.get(channelId);
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
      },
    });
    await Data.Repo.ChannelsCache.set(channelId);
  } catch (error) {
    // Attempt to rollback both DB and cache
    await db.channels.deleteMany({ where: { channelId, guildId } }).catch(() => {});
    await Data.Repo.ChannelsCache.remove(channelId).catch(() => {});
    Services.Logger.error(error);
  }
  return channelId;
};

/**
 * Remove channel from channels DB & cache
 * @param channelId ID of the channel
 * @returns Redis response
 */
const remove = async (channelId: Snowflake) => {
  try {
    await db.channels.deleteMany({ where: { channelId } });
    await Data.Repo.ChannelsCache.remove(channelId);
  } catch (error) {
    // Attempt to rollback the cache
    await Data.Repo.ChannelsCache.set(channelId).catch(() => {});
    Services.Logger.error(error);
  }
  return channelId;
};

/**
 * Get size of the channels cache
 * @returns Size of the cache
 */
const getSize = async () => {
  return Data.Repo.ChannelsCache.getSize();
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
 * Sync all channels from DB to cache by comparing and updating differences
 * @returns void
 */
const syncCache = async () => {
  try {
    Services.Logger.info('Starting cache sync with DB');

    // Get channels from both DB and cache
    const [dbChannels, cachedChannelIds] = await Promise.all([
      db.channels.findMany({
        select: { channelId: true },
      }),
      Data.Repo.ChannelsCache.getAll(),
    ]);

    const dbChannelIds = new Set(dbChannels.map(c => c.channelId));
    const cacheChannelIds = new Set(cachedChannelIds);

    // Find channels to add to cache (in DB but not in cache)
    const channelsToAdd = [...dbChannelIds].filter(id => !cacheChannelIds.has(id));

    // Find channels to remove from cache (in cache but not in DB)
    const channelsToRemove = [...cacheChannelIds].filter(id => !dbChannelIds.has(id));

    // Add missing channels to cache
    if (channelsToAdd.length > 0) {
      await Data.Repo.ChannelsCache.setMany(channelsToAdd);
      Services.Logger.info(
        `Added ${channelsToAdd.length} channels to cache: ${channelsToAdd.join(', ')}`
      );
    }

    // Remove extra channels from cache
    if (channelsToRemove.length > 0) {
      await Data.Repo.ChannelsCache.removeMany(channelsToRemove);
      Services.Logger.info(
        `Removed ${channelsToRemove.length} channels from cache: ${channelsToRemove.join(', ')}`
      );
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
  getSize,
  countByGuild,
  syncCache,
};
