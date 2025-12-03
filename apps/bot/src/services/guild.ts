import type { Snowflake } from 'discord.js';
import { Data } from '../data/index.js';
import { logger } from '../utils/logger.js';

/**
 * Delete a guild and all its associated channels
 * @param guildId The guild ID
 * @returns void
 */
const remove = async (guildId: Snowflake) => {
  try {
    const response = await Data.API.Backend.deleteGuild(guildId);

    if (!response.ok) {
      logger.error(
        `Failed to delete guild ${guildId}: ${response.status} ${response.statusText}`
      );
      return;
    }

    logger.info(`Successfully deleted guild ${guildId} and all associated channels`);
  } catch (error) {
    logger.error(error, `Error deleting guild ${guildId}`);
  }
};

export const Guild = {
  remove,
};
