import { DatabaseIDs, RedisClient, type RedisClientType } from '@ap/redis';
import { logger } from 'utils/logger.js';

// Initialize Redis clients
const channelsClient = new RedisClient(DatabaseIDs.Channels, logger);
// MIGRATION: After transition (6 months), remove migratedGuildsClient
const migratedGuildsClient = new RedisClient(DatabaseIDs.MigratedGuilds, logger);
const discordAuthClient = new RedisClient(DatabaseIDs.DiscordAuthCache, logger);

await channelsClient.connect();
await migratedGuildsClient.connect();
await discordAuthClient.connect();

export const Redis: {
  client: RedisClientType;
  MigratedGuilds: RedisClientType;
  DiscordAuth: RedisClientType;
} = {
  client: channelsClient.client, // Backward compatibility
  MigratedGuilds: migratedGuildsClient.client, // MIGRATION: Remove after 6 months
  DiscordAuth: discordAuthClient.client,
};
