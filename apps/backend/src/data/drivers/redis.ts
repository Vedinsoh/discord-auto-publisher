import { DatabaseIDs, RedisClient } from '@ap/redis';
import { logger } from 'utils/logger.js';

// Initialize Redis client
export const Redis = new RedisClient(DatabaseIDs.Channels, logger);
await Redis.connect();
