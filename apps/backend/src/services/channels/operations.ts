import { db } from '@ap/database';
import type { Filter } from '@ap/validations';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import { logger } from 'utils/logger.js';

/**
 * Get channel from DB
 * @param channelId ID of the channel
 * @returns Channel record or null if not found
 */
export const find = async (channelId: Snowflake) => {
  return await db.channels.findUnique({
    where: { channelId },
  });
};

/**
 * Add filter to channel
 * @param channelId ID of the channel
 * @param filter Filter data
 * @returns void
 */
export const addFilter = async (channelId: Snowflake, filter: Filter) => {
  const channel = await db.channels.findUnique({
    where: { channelId },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  const updatedFilters = [...channel.filters, filter];
  let dbUpdated = false;

  try {
    await db.channels.update({
      where: { channelId },
      data: {
        filters: updatedFilters,
      },
    });
    dbUpdated = true;
    await Data.Channels.Cache.updateFilters(
      channelId,
      updatedFilters,
      (channel.filterMode as 'any' | 'all') || 'any'
    );
  } catch (error) {
    // If DB update succeeded but cache update failed, rollback DB
    if (dbUpdated) {
      await db.channels
        .update({
          where: { channelId },
          data: { filters: channel.filters },
        })
        .catch(() => {});
    }
    logger.error(error);
    throw error;
  }
};

/**
 * Remove filter from channel
 * @param channelId ID of the channel
 * @param filterId ID of the filter
 * @returns void
 */
export const removeFilter = async (channelId: Snowflake, filterId: string) => {
  const channel = await db.channels.findUnique({
    where: { channelId },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  const updatedFilters = channel.filters.filter(f => f.id !== filterId);
  let dbUpdated = false;

  try {
    await db.channels.update({
      where: { channelId },
      data: {
        filters: updatedFilters,
      },
    });
    dbUpdated = true;
    await Data.Channels.Cache.updateFilters(
      channelId,
      updatedFilters,
      (channel.filterMode as 'any' | 'all') || 'any'
    );
  } catch (error) {
    // If DB update succeeded but cache update failed, rollback DB
    if (dbUpdated) {
      await db.channels
        .update({
          where: { channelId },
          data: { filters: channel.filters },
        })
        .catch(() => {});
    }
    logger.error(error);
    throw error;
  }
};

/**
 * Update filter in channel
 * @param channelId ID of the channel
 * @param filterId ID of the filter
 * @param filterData Updated filter data
 * @returns void
 */
export const updateFilter = async (
  channelId: Snowflake,
  filterId: string,
  filterData: Partial<Omit<Filter, 'id' | 'createdAt'>>
) => {
  const channel = await db.channels.findUnique({
    where: { channelId },
  });

  if (!channel) {
    throw new Error('Channel not found');
  }

  const filterIndex = channel.filters.findIndex(f => f.id === filterId);

  const existingFilter = channel.filters[filterIndex];

  if (!existingFilter) {
    throw new Error('Filter not found');
  }

  const updatedFilters = [...channel.filters];
  updatedFilters[filterIndex] = {
    id: existingFilter.id,
    type: filterData.type ?? existingFilter.type,
    mode: filterData.mode ?? existingFilter.mode,
    values: filterData.values ?? existingFilter.values,
    createdAt: existingFilter.createdAt,
  };

  let dbUpdated = false;

  try {
    await db.channels.update({
      where: { channelId },
      data: {
        filters: updatedFilters,
      },
    });
    dbUpdated = true;
    await Data.Channels.Cache.updateFilters(
      channelId,
      updatedFilters,
      (channel.filterMode as 'any' | 'all') || 'any'
    );
  } catch (error) {
    // If DB update succeeded but cache update failed, rollback DB
    if (dbUpdated) {
      await db.channels
        .update({
          where: { channelId },
          data: { filters: channel.filters },
        })
        .catch(() => {});
    }
    logger.error(error);
    throw error;
  }
};
