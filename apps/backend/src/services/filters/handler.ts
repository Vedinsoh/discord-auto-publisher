import { randomUUID } from 'node:crypto';
import { ResponseStatus, ServiceResponseImpl } from '@ap/types';
import { isPremiumInstance } from '@ap/utils';
import type { CreateFilter } from '@ap/validations';
import type { Snowflake } from 'discord-api-types/globals';
import { StatusCodes } from 'http-status-codes';
import { Services } from 'services/index.js';

const MAX_FILTERS_PER_CHANNEL = 5;

/**
 * Add filter to channel
 * @param guildId ID of the guild
 * @param channelId ID of the channel
 * @param filterData Filter data
 * @returns ServiceResponse
 */
const add = async (_guildId: Snowflake, channelId: Snowflake, filterData: CreateFilter) => {
  if (!isPremiumInstance) {
    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Filters are only available in premium edition',
      { success: false },
      StatusCodes.FORBIDDEN
    );
  }

  try {
    const channel = await Services.Channels.DB.find(channelId);

    if (!channel) {
      return new ServiceResponseImpl(
        ResponseStatus.Failed,
        'Channel not found',
        { success: false },
        StatusCodes.NOT_FOUND
      );
    }

    if (channel.filters.length >= MAX_FILTERS_PER_CHANNEL) {
      return new ServiceResponseImpl(
        ResponseStatus.Failed,
        `Maximum ${MAX_FILTERS_PER_CHANNEL} filters per channel`,
        { success: false },
        StatusCodes.BAD_REQUEST
      );
    }

    const filter = {
      id: randomUUID(),
      type: filterData.type,
      mode: filterData.mode,
      value: filterData.value,
      createdAt: new Date(),
    };

    await Services.Channels.DB.addFilter(channelId, filter);

    Services.Logger.debug(
      `Added ${filterData.type} filter to channel ${channelId}: ${filterData.value}`
    );

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Filter added successfully',
      { success: true, filter },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Failed to add filter',
      { success: false },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Remove filter from channel
 * @param channelId ID of the channel
 * @param filterId ID of the filter
 * @returns ServiceResponse
 */
const remove = async (channelId: Snowflake, filterId: string) => {
  if (!isPremiumInstance) {
    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Filters are only available in premium edition',
      { success: false },
      StatusCodes.FORBIDDEN
    );
  }

  try {
    await Services.Channels.DB.removeFilter(channelId, filterId);

    Services.Logger.debug(`Removed filter ${filterId} from channel ${channelId}`);

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Filter removed successfully',
      { success: true },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Failed to remove filter',
      { success: false },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Get filters for channel
 * @param channelId ID of the channel
 * @returns Array of filters
 */
const list = async (channelId: Snowflake) => {
  if (!isPremiumInstance) {
    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Filters are only available in premium edition',
      { filters: [] },
      StatusCodes.FORBIDDEN
    );
  }

  try {
    const channel = await Services.Channels.DB.find(channelId);

    if (!channel) {
      return new ServiceResponseImpl(
        ResponseStatus.Failed,
        'Channel not found',
        { filters: [] },
        StatusCodes.NOT_FOUND
      );
    }

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Filters retrieved successfully',
      { filters: channel.filters },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Failed to get filters',
      { filters: [] },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const Handler = {
  add,
  remove,
  list,
};
