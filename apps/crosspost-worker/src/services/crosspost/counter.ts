import { secToMin } from '@ap/utils';
import type { Snowflake } from 'discord-api-types/globals';
import { ChannelCounter } from 'services/caches.js';
import { logger } from 'utils/logger.js';

/**
 * Add channel to crossposts counter
 * @param channelId ID of the channel
 * @param options.count Crossposts count
 * @param options.expiry Expiration time in seconds
 */
export const set = async (channelId: Snowflake, options?: { count?: number; expiry?: number }) => {
  try {
    const channel = await ChannelCounter.set(channelId, {
      ttl: options?.expiry,
      count: options?.count,
    });

    logger.debug(
      `Crossposts counter set for channel ${channelId}, count: ${channel.count || 0}, expiry: ${channel.expiry ? `${Math.round(secToMin(channel.expiry))}s` : 'default'}`
    );
  } catch (error) {
    logger.error(error);
  }
};

/**
 * Get crossposts count for the channel
 * @param channelId ID of the channel
 * @returns Number of crossposts
 */
export const getCount = (channelId: Snowflake) => {
  return ChannelCounter.getCount(channelId);
};

/**
 * Get count of unique channels in the crossposts counter
 * @returns Size of the counter
 */
export const getChannelsCount = () => {
  return ChannelCounter.getSize();
};

/**
 * Increment crossposts counter for the channel
 * @param channelId ID of the channel
 * @param expiry Expiration time in seconds
 */
export const increment = async (channelId: Snowflake, expiry?: number) => {
  // Get previous crosspots count for the channel
  const prevCount = await ChannelCounter.getCount(channelId);

  // Add the channel crossposts counter if it does not exist
  if (!prevCount) {
    return await set(channelId, { expiry });
  }

  // Get previous expiration time
  const prevExpiry = await ChannelCounter.getExpiration(channelId);

  // Fallback to add if the key expired or does not exist
  if (!prevExpiry) {
    return await set(channelId, {
      expiry,
    });
  }

  // Increment crossposts counter for the channel and re-set the expiration time
  const updatedCount = prevCount + 1;
  await set(channelId, {
    count: updatedCount,
    expiry: prevExpiry,
  });
};

/**
 * Check if the channel is over the crossposts limit
 * @param channelId ID of the channel
 * @returns Boolean
 */
export const isOverLimit = async (channelId: Snowflake) => {
  const count = await getCount(channelId);
  const isOverLimit = count >= 10;

  if (isOverLimit) {
    logger.debug(`Channel ${channelId} is over the crossposts limit`);
  }

  return isOverLimit;
};

export const Counter = { getCount, getChannelsCount, increment, isOverLimit, set };
