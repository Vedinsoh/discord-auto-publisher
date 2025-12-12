import { DatabaseIDs, RedisClient } from '@ap/redis';
import { logger } from 'utils/logger.js';

// Initialize Redis clients
const channelCounterClient = new RedisClient(DatabaseIDs.ChannelsCrosspostsCount, logger);
const rateLimitsClient = new RedisClient(DatabaseIDs.RateLimitsCache, logger);

await channelCounterClient.connect();
await rateLimitsClient.connect();

export const Redis = {
  ChannelCounter: channelCounterClient.client,
  RateLimits: rateLimitsClient.client,
};
