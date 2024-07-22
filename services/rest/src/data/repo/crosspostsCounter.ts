import { Snowflake } from 'discord-api-types/globals';

import { minToSec } from '@/utils/timeConversions';

import { Drivers } from '../drivers';

const { Redis } = Drivers;
const { Keys } = Redis;

// Initialize Redis and connect to database
const redis = new Redis.Client(Redis.DatabaseIDs.CrosspostsCounter);
await redis.connect();

// Initialize Redis client
const client = redis.client;

// Create key for the channel ID
const createKey = (channelId: Snowflake) => `${Keys.Channel}:${channelId}`;

/**
 * Add channel to crossposts counter
 * @param channelId ID of the channel
 * @returns Redis response
 */
const add = async (channelId: Snowflake, ttlSeconds = minToSec(60)) => {
  return client.setEx(createKey(channelId), ttlSeconds, '1');
};

/**
 * Increment crosspost counter
 * @param channelId ID of the channel
 * @returns Redis response
 */
const increment = async (channelId: Snowflake, ttlSeconds?: number) => {
  // Get previous crosspots count for the channel
  const prevCount = await client.get(createKey(channelId));

  // Add the channel crossposts counter if it does not exist
  if (!prevCount) {
    return await add(channelId, ttlSeconds);
  }

  // Get previous TTL
  const prevTtl = await client.ttl(createKey(channelId));

  // Fallback to add if the key's TTL expired or does not exist
  if (prevTtl === -2) {
    return await add(channelId, ttlSeconds);
  }

  // Increment crossposts counter for the channel and re-set the TTL
  const updatedCount = String(Number(prevCount) + 1);
  return await client.setEx(createKey(channelId), prevTtl, updatedCount);
};

/**
 * Get crossposts count for the channel
 * @param channelId ID of the channel
 * @returns Number of crossposts
 */
const getCount = async (channelId: Snowflake) => {
  const count = await client.get(createKey(channelId));
  return count ? Number(count) : 0;
};

/**
 * Get count of all channels in the crossposts counter
 * @returns Size of the counter
 */
const getSize = async () => {
  return await client.dbSize();
};

export const CrosspostsCounter = { add, getCount, getSize, increment };
