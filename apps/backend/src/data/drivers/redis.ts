import { createRedisClient, DatabaseIDs, type RedisClient } from '@ap/redis';
import { logger } from 'utils/logger.js';

const channelsClient = await createRedisClient(DatabaseIDs.Channels, logger);
const migratedGuildsClient = await createRedisClient(DatabaseIDs.MigratedGuilds, logger);
const discordAuthClient = await createRedisClient(DatabaseIDs.DiscordAuth, logger);

export const Redis: {
  client: RedisClient;
  MigratedGuilds: RedisClient;
  DiscordAuth: RedisClient;
} = {
  client: channelsClient,
  MigratedGuilds: migratedGuildsClient,
  DiscordAuth: discordAuthClient,
};
