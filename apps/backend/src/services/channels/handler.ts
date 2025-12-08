import { ResponseStatus, ServiceResponseImpl } from '@ap/types';
import type { Snowflake } from 'discord-api-types/globals';
import { StatusCodes } from 'http-status-codes';
import { PlanLimits } from 'lib/constants/app.js';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

/**
 * Get channel from channels cache
 * @param channelId ID of the channel
 * @returns Channel data with filters or null if not found
 */
const getCached = async (channelId: Snowflake) => {
  try {
    const cached = await Services.Channels.DB.findCached(channelId);
    if (!cached) return null;

    // Cached data is { filters: [...] }, return it directly
    return cached;
  } catch (error) {
    logger.error(error);
    return null;
  }
};

/**
 * Add channel to channels list
 * @param channelId ID of the channel
 * @returns Channel ID
 */
const add = async (guildId: Snowflake, channelId: Snowflake) => {
  // Check if channel already exists
  const existingChannel = await getCached(channelId);
  if (existingChannel) {
    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Channel already exists',
      {
        success: false,
      },
      StatusCodes.CONFLICT
    );
  }

  // Check if guild has hit the channels limit
  const guildChannelsCount = await Services.Channels.DB.countByGuild(guildId);
  if (PlanLimits.ChannelsPerGuild !== 0 && guildChannelsCount >= PlanLimits.ChannelsPerGuild) {
    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Guild has reached the channels limit',
      {
        success: false,
      },
      StatusCodes.BAD_REQUEST
    );
  }

  try {
    // Ensure guild exists before adding channel
    await Services.Guilds.Handler.ensureExists(guildId);

    await Services.Channels.DB.create(guildId, channelId);
    logger.debug(`Added channel ${channelId} for guild ${guildId}`);

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Channel added successfully',
      {
        success: true,
      },
      StatusCodes.OK
    );
  } catch (error) {
    logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Failed to add channel',
      {
        success: false,
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Remove channel from channels list
 * @param channelId ID of the channel
 * @returns Redis response
 */
const remove = async (channelId: Snowflake) => {
  try {
    await Services.Channels.DB.remove(channelId);
    logger.debug(`Removed channel ${channelId}`);

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Channel removed successfully',
      {
        success: true,
      },
      StatusCodes.OK
    );
  } catch (error) {
    logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Failed to remove channel',
      {
        success: false,
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Update filter mode for channel
 * @param channelId ID of the channel
 * @param mode Filter mode ('any' or 'all')
 * @returns ServiceResponse
 */
const updateFilterMode = async (channelId: Snowflake, mode: 'any' | 'all') => {
  try {
    // Check if channel exists
    const channel = await Services.Channels.DB.find(channelId);

    if (!channel) {
      return new ServiceResponseImpl(
        ResponseStatus.Failed,
        'Channel not found',
        { success: false },
        StatusCodes.NOT_FOUND
      );
    }

    await Services.Channels.DB.updateFilterMode(channelId, mode);

    logger.debug(`Updated filter mode for channel ${channelId} to ${mode}`);

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Filter mode updated successfully',
      { success: true, mode },
      StatusCodes.OK
    );
  } catch (error) {
    logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Failed to update filter mode',
      { success: false },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Flag channel as invalid
 * @param channelId ID of the channel
 * @returns ServiceResponse
 */
const flagChannel = async (channelId: Snowflake) => {
  try {
    await Services.Channels.DB.flag(channelId);

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Channel flagged successfully',
      { success: true },
      StatusCodes.OK
    );
  } catch (error) {
    logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Failed to flag channel',
      { success: false },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Unflag channel (clear invalid status)
 * @param channelId ID of the channel
 * @returns ServiceResponse
 */
const unflagChannel = async (channelId: Snowflake) => {
  try {
    await Services.Channels.DB.unflag(channelId);

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Channel unflagged successfully',
      { success: true },
      StatusCodes.OK
    );
  } catch (error) {
    logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Failed to unflag channel',
      { success: false },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const Handler = {
  get: getCached,
  add,
  remove,
  updateFilterMode,
  flagChannel,
  unflagChannel,
};
