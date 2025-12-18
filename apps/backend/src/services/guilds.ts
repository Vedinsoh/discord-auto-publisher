import { db } from '@ap/database';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import { logger } from 'utils/logger.js';
import { Channels } from './channels/index.js';

/**
 * Create or update guild in DB
 * @param guildId ID of the guild
 * @returns Created/updated guild
 */
const upsert = async (guildId: Snowflake) => {
  try {
    return await db.guilds.upsert({
      where: { guildId },
      create: { guildId },
      update: {},
    });
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

/**
 * Get all channels for a guild from DB
 * @param guildId ID of the guild
 * @returns Array of channel IDs
 */
const getChannels = async (guildId: Snowflake): Promise<string[]> => {
  try {
    const channels = await db.channels.findMany({
      where: { guildId },
      select: { channelId: true },
    });

    const channelIds = channels.map(c => c.channelId);

    logger.debug(`Retrieved ${channelIds.length} channels for guild ${guildId}`);

    return channelIds;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve channels');
  }
};

/**
 * Delete guild and all its associated channels from DB & cache
 * @param guildId ID of the guild
 */
const remove = async (guildId: Snowflake): Promise<void> => {
  try {
    // Remove all channels for this guild using efficient single query
    const removedChannelIds = await Channels.removeByGuildId(guildId);

    // Delete guild from DB
    await db.guilds.deleteMany({
      where: { guildId },
    });

    // MIGRATION: Remove guild migration marker from cache (also done in removeByGuildId,
    // but needed here for guilds with 0 channels that were registered via registerNewGuild)
    // TODO: After transition (6 months), remove this line
    await Data.Drivers.Redis.MigratedGuilds.del(`migrated_guild:${guildId}`);

    logger.debug(`Deleted guild ${guildId} and ${removedChannelIds.length} associated channels`);
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to remove guild');
  }
};

/**
 * Register new guild in DB and cache (marks as using new system)
 * MIGRATION: After transition (6 months), remove this function entirely
 * @param guildId ID of the guild
 */
const registerNewGuild = async (guildId: Snowflake): Promise<void> => {
  try {
    // Create guild in DB (source of truth for cache sync)
    await upsert(guildId);

    // Set migration marker in cache (DB 3)
    await Data.Drivers.Redis.MigratedGuilds.set(`migrated_guild:${guildId}`, '1');

    logger.debug(`Registered new guild ${guildId} in DB and cache`);
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to register new guild');
  }
};

export const Guilds = {
  upsert,
  getChannels,
  remove,
  registerNewGuild,
};
