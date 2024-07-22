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

/**
 * Add crosspost to counter
 * @param channelId ID of the channel
 * @param messageId ID of the message
 * @returns Redis response
 */
const add = async (channelId: Snowflake, messageId: Snowflake) => {
  return client.setEx(`${Keys.Crosspost}:${channelId}:${messageId}`, minToSec(60), '1');
};

/**
 * Get crosspost count
 * @param channelId ID of the channel
 * @returns Number of crossposts
 */
const getCount = async (channelId: Snowflake) => {
  return (await client.keys(`${Keys.Crosspost}:${channelId}:*`)).length;
};

/**
 * Get crosspost counter size
 * @returns Size of the counter
 */
const getSize = async () => {
  return client.dbSize();
};

export const CrosspostsCounter = { add, getCount, getSize };
