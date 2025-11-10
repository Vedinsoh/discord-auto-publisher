import { Constants } from 'constants/index.js';
import { Drivers } from 'data/drivers/index.js';
import type { Snowflake } from 'discord-api-types/globals';

const { DatabaseIDs, Keys } = Constants.Data.Redis;

// Initialize Redis and connect to database
const redis = new Drivers.Redis.Client(DatabaseIDs.Channels);
await redis.connect();

// Initialize Redis client
const client = redis.client;

// Create key for the channel ID
const _createKey = (channelId: Snowflake) => `${Keys.Channel}:${channelId}`;

/**
 * Add channel to cached channels list
 * @param channelId ID of the channel
 * @returns Redis response
 */
const set = async (channelId: Snowflake) => {
  return await client.set(_createKey(channelId), '1');
};

/**
 * Add many channels to cached channels list
 * @param channelIds IDs of the channels
 * @returns Redis response
 */
const setMany = async (channelIds: Snowflake[]) => {
  if (channelIds.length === 0) return;
  const channelIdKeys = channelIds.flatMap(id => [_createKey(id), '1']);
  return await client.mSet(channelIdKeys);
};

/**
 * Remove channel from cached channels list
 * @param channelId ID of the channel
 * @returns Redis response
 */
const remove = async (channelId: Snowflake) => {
  return await client.del(_createKey(channelId));
};

/**
 * Remove many channels from cached channels list
 * @param channelIds IDs of the channels
 * @returns Redis response
 */
const removeMany = async (channelIds: Snowflake[]) => {
  return await client.del(channelIds.map(id => _createKey(id)));
};

/**
 * Get channel from cached channels list
 * @param channelId ID of the channel
 * @returns Channel ID or null if not found
 */
const get = async (channelId: Snowflake) => {
  const exists = await client.exists(_createKey(channelId));
  return exists === 1 ? channelId : null;
};

/**
 * Get all cached channel IDs
 * @returns Array of channel IDs
 */
const getAll = async (): Promise<Snowflake[]> => {
  const keyPattern = `${Keys.Channel}:*`;
  const keys: string[] = [];
  let cursor = 0;

  // Use SCAN instead of KEYS for production safety (non-blocking)
  do {
    const result = await client.scan(cursor, {
      MATCH: keyPattern,
      COUNT: 100, // Scan 100 keys at a time
    });
    cursor = result.cursor;
    keys.push(...result.keys);
  } while (cursor !== 0);

  return keys.map(key => key.replace(`${Keys.Channel}:`, '') as Snowflake);
};

/**
 * Get count of all channels in the cached channels list
 * @returns Size of the list
 */
const getSize = async () => {
  const keyPattern = `${Keys.Channel}:*`;
  const keys: string[] = [];
  let cursor = 0;

  // Use SCAN instead of KEYS for production safety (non-blocking)
  do {
    const result = await client.scan(cursor, {
      MATCH: keyPattern,
      COUNT: 100, // Scan 100 keys at a time
    });
    cursor = result.cursor;
    keys.push(...result.keys);
  } while (cursor !== 0);

  return keys.length;
};

export const ChannelsCache = { set, setMany, remove, removeMany, get, getAll, getSize };
