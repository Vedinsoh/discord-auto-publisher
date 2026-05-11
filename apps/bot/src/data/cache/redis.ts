import { createRedisClient, DatabaseIDs, type RedisClient } from '@ap/redis';
import { logger } from 'utils/logger.js';

const channelsClient = await createRedisClient(DatabaseIDs.Channels, logger);
const migratedGuildsClient = await createRedisClient(DatabaseIDs.MigratedGuilds, logger);

export const Redis: {
  Channels: RedisClient;
  MigratedGuilds: RedisClient;
} = {
  Channels: channelsClient,
  MigratedGuilds: migratedGuildsClient,
};
