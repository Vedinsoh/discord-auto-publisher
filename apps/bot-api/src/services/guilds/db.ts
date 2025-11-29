import { db } from '@ap/database';
import type { Snowflake } from 'discord-api-types/globals';
import { Services } from 'services/index.js';

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
    Services.Logger.error(error);
    throw error;
  }
};

/**
 * Delete guild and all its associated channels from DB & cache
 * @param guildId ID of the guild
 * @returns void
 */
const remove = async (guildId: Snowflake) => {
  try {
    // Remove all channels for this guild using efficient single query
    const removedChannelIds = await Services.Channels.DB.removeByGuildId(guildId);

    // Delete guild from DB
    await db.guilds.deleteMany({
      where: { guildId },
    });

    Services.Logger.debug(
      `Deleted guild ${guildId} and ${removedChannelIds.length} associated channels`
    );
  } catch (error) {
    Services.Logger.error(error);
    throw error;
  }
};

export const DB = {
  upsert,
  remove,
};
