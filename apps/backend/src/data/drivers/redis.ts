import { DatabaseIDs, RedisClient } from '@ap/redis';
import { logger } from 'utils/logger.js';

// Initialize Redis clients
const channelsClient = new RedisClient(DatabaseIDs.Channels, logger);
// MIGRATION: After transition (6 months), remove migratedGuildsClient
const migratedGuildsClient = new RedisClient(DatabaseIDs.MigratedGuilds, logger);

await channelsClient.connect();
await migratedGuildsClient.connect();

export const Redis = {
  client: channelsClient.client, // Backward compatibility
  MigratedGuilds: migratedGuildsClient.client, // MIGRATION: Remove after 6 months
};
