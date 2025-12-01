import { container } from '@sapphire/framework';
import type { Snowflake } from 'discord.js';
import { Data } from '../data/index.js';

/**
 * Delete a guild and all its associated channels
 * @param guildId The guild ID
 * @returns void
 */
const remove = async (guildId: Snowflake) => {
  try {
    const response = await Data.API.Backend.deleteGuild(guildId);

    if (!response.ok) {
      container.logger.error(
        `Failed to delete guild ${guildId}: ${response.status} ${response.statusText}`
      );
      return;
    }

    container.logger.info(`Successfully deleted guild ${guildId} and all associated channels`);
  } catch (error) {
    container.logger.error(`Error deleting guild ${guildId}:`, error);
  }
};

export const Guild = {
  remove,
};
