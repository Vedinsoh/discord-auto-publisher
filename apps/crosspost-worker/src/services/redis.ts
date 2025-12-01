import { createChannelsCache, DatabaseIDs, Keys, RedisClient } from '@ap/redis';
import { Logger } from './logger.js';

// Initialize Redis client
const redisClient = new RedisClient(DatabaseIDs.Channels, Logger);
await redisClient.connect();

// Create channels cache
export const ChannelsCache = createChannelsCache(redisClient.client, Keys.Channel);
