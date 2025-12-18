import { DatabaseIDs, RedisClient } from '@ap/redis';
import { logger } from 'utils/logger.js';

// Initialize Redis clients
const channelsClient = new RedisClient(DatabaseIDs.Channels, logger);
const channelCounterClient = new RedisClient(DatabaseIDs.ChannelsCrosspostsCount, logger);
const rateLimitsClient = new RedisClient(DatabaseIDs.RateLimitsCache, logger);
// MIGRATION: After transition (6 months), remove migratedGuildsClient
const migratedGuildsClient = new RedisClient(DatabaseIDs.MigratedGuilds, logger);

await channelsClient.connect();
await channelCounterClient.connect();
await rateLimitsClient.connect();
await migratedGuildsClient.connect();

export const Redis = {
  Channels: channelsClient.client,
  ChannelCounter: channelCounterClient.client,
  RateLimits: rateLimitsClient.client,
  MigratedGuilds: migratedGuildsClient.client, // MIGRATION: Remove after 6 months
};
