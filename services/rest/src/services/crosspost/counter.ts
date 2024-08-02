import { Snowflake } from 'discord-api-types/globals';

import { Data } from '@/data';
import { Services } from '@/services';
import { secToMin } from '@/utils/timeConversions';

/**
 * Add channel to crossposts counter
 * @param channelId ID of the channel
 * @param options.count Crossposts count
 * @param options.expiry Expiration time in seconds
 */
const set = async (channelId: Snowflake, options?: { count?: number; expiry?: number }) => {
  try {
    await Data.Repo.CrosspostsCounter.set(channelId, { ttl: options?.expiry, count: options?.count });

    Services.Logger.debug(
      `Crossposts counter set for channel ${channelId}, count: ${options?.count || 0}, expiry: ${options?.expiry ? Math.round(secToMin(options?.expiry)) : 'default'}`
    );
  } catch (error) {
    Services.Logger.error(error);
  }
};

/**
 * Get crossposts count for the channel
 * @param channelId ID of the channel
 * @returns Number of crossposts
 */
const getCount = (channelId: Snowflake) => {
  return Data.Repo.CrosspostsCounter.getCount(channelId);
};

/**
 * Get count of unique channels in the crossposts counter
 * @returns Size of the counter
 */
const getChannelsCount = () => {
  return Data.Repo.CrosspostsCounter.getSize();
};

/**
 * Increment crossposts counter for the channel
 * @param channelId ID of the channel
 * @param expiry Expiration time in seconds
 */
const increment = async (channelId: Snowflake, expiry?: number) => {
  // Get previous crosspots count for the channel
  const prevCount = await Data.Repo.CrosspostsCounter.getCount(channelId);

  // Add the channel crossposts counter if it does not exist
  if (!prevCount) {
    return await set(channelId, { expiry });
  }

  // Get previous expiration time
  const prevExpiry = await Data.Repo.CrosspostsCounter.getExpiration(channelId);

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
  Services.Logger.debug(`Channel ${channelId} incremented in the crossposts counter (count: ${updatedCount})`);
};

/**
 * Check if the channel is over the crossposts limit
 * @param channelId ID of the channel
 * @returns Boolean
 */
const isOverLimit = async (channelId: Snowflake) => {
  const count = await getCount(channelId);
  const isOverLimit = count >= 10;

  if (isOverLimit) {
    Services.Logger.debug(`Channel ${channelId} is over the crossposts limit`);
  }

  return isOverLimit;
};

export const Counter = { getCount, getChannelsCount, increment, isOverLimit, set };
