import { ResponseStatus, ServiceResponseImpl } from '@ap/types';
import type { Snowflake } from 'discord-api-types/globals';
import { StatusCodes } from 'http-status-codes';
import { PlanLimits } from 'lib/constants/app.js';
import { Services } from 'services/index.js';

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
    Services.Logger.error(error);
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
    Services.Logger.debug(`Added channel ${channelId} for guild ${guildId}`);

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Channel added successfully',
      {
        success: true,
      },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

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
    Services.Logger.debug(`Removed channel ${channelId}`);

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Channel removed successfully',
      {
        success: true,
      },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

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

export const Handler = {
  get: getCached,
  add,
  remove,
};
