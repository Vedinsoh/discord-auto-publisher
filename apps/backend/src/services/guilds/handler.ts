import { ResponseStatus, ServiceResponseImpl } from '@ap/types';
import type { Snowflake } from 'discord-api-types/globals';
import { StatusCodes } from 'http-status-codes';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

/**
 * Ensure guild exists in DB (creates if not exists)
 * @param guildId ID of the guild
 * @returns void
 */
const ensureExists = async (guildId: Snowflake) => {
  try {
    await Services.Guilds.DB.upsert(guildId);
    logger.debug(`Ensured guild ${guildId} exists in DB`);
  } catch (error) {
    logger.error(error);
    throw error;
  }
};

/**
 * Get all channels for a guild
 * @param guildId ID of the guild
 * @returns Service response with channel IDs
 */
const getChannels = async (guildId: Snowflake) => {
  try {
    const channelIds = await Services.Guilds.DB.getChannels(guildId);
    logger.debug(`Retrieved ${channelIds.length} channels for guild ${guildId}`);

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Channels retrieved successfully',
      {
        channelIds,
      },
      StatusCodes.OK
    );
  } catch (error) {
    logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Failed to retrieve channels',
      {
        channelIds: [],
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Remove guild and all its channels
 * @param guildId ID of the guild
 * @returns Service response
 */
const remove = async (guildId: Snowflake) => {
  try {
    await Services.Guilds.DB.remove(guildId);
    logger.debug(`Removed guild ${guildId} and all associated channels`);

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Guild and associated channels removed successfully',
      {
        success: true,
      },
      StatusCodes.OK
    );
  } catch (error) {
    logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Failed to remove guild',
      {
        success: false,
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const Handler = {
  ensureExists,
  getChannels,
  remove,
};
