import { Snowflake } from 'discord-api-types/globals';

import { Data } from '@/data';
import { Services } from '@/services';

/**
 * Add channel to crossposts counter
 * @param channelId ID of the channel
 * @param options.count Crossposts count
 * @param options.expiry Expiration time in seconds
 */
const _add = async (channelId: Snowflake, options: { count?: number; expiry?: number }) => {
  try {
    const { count, expiry } = options;

    await Data.Repo.CrosspostsCounter.add(channelId, { ttl: expiry, count: count?.toString() });

    Services.Logger.debug(`Added channel ${channelId} to the crossposts counter`);
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
    return await _add(channelId, { expiry });
  }

  // Get previous expiration time
  const prevExpiry = await Data.Repo.CrosspostsCounter.getExpiration(channelId);

  // Fallback to add if the key expired or does not exist
  if (!prevExpiry) {
    return await _add(channelId, {
      expiry,
    });
  }

  // Increment crossposts counter for the channel and re-set the expiration time
  const updatedCount = prevCount + 1;
  await _add(channelId, {
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
  return count >= 10;
};

export const CrosspostsCounter = { getCount, getChannelsCount, increment, isOverLimit };
