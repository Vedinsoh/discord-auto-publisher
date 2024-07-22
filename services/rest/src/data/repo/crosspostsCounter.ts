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
const _createKey = (channelId: Snowflake) => `${Keys.Channel}:${channelId}`;

/**
 * Add channel to crossposts counter
 * @param channelId ID of the channel
 * @param options.count Crossposts count
 * @param options.ttl Expiration time in seconds
 * @returns Redis response
 */
const add = async (channelId: Snowflake, { count = '1', ttl = minToSec(60) }) => {
  return await client.setEx(_createKey(channelId), ttl, count);
};

/**
 * Get expiration time of the key
 * @param channelId ID of the channel
 * @returns Expiration of the key in seconds, or null if the key does not exist
 */
const getExpiration = async (channelId: Snowflake) => {
  const ttl = await client.ttl(_createKey(channelId));
  if (ttl === -2) {
    return null;
  }
  return ttl;
};

/**
 * Get crossposts count for the channel
 * @param channelId ID of the channel
 * @returns Number of crossposts
 */
const getCount = async (channelId: Snowflake) => {
  const count = await client.get(_createKey(channelId));
  return count ? Number(count) : 0;
};

/**
 * Get count of all channels in the crossposts counter
 * @returns Size of the counter
 */
const getSize = async () => {
  return await client.dbSize();
};

export const CrosspostsCounter = { add, getCount, getExpiration, getSize };
