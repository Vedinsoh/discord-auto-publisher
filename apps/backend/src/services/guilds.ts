import { db } from '@ap/database';
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
 * Ensure guild exists in DB (creates if not exists)
 * @param guildId ID of the guild
 * @returns void
 */
const ensureExists = async (guildId: Snowflake) => {
  try {
    await upsert(guildId);
    logger.debug(`Ensured guild ${guildId} exists in DB`);
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

    logger.debug(`Deleted guild ${guildId} and ${removedChannelIds.length} associated channels`);
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to remove guild');
  }
};

export const Guilds = {
  upsert,
  ensureExists,
  getChannels,
  remove,
};
