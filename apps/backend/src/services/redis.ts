import { createChannelsCache, DatabaseIDs, Keys, RedisClient } from '@ap/redis';
import { logger } from 'utils/logger.js';

// Initialize Redis client
const redisClient = new RedisClient(DatabaseIDs.Channels, logger);
await redisClient.connect();

// Create channels cache
export const ChannelsCache = createChannelsCache(redisClient.client, Keys.Channel);
