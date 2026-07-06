import { config } from '@ap/config';
import { createRedisClient, DatabaseIDs, type RedisClient } from '@ap/redis';
import { logger } from 'utils/logger.js';

const channelsClient = await createRedisClient(DatabaseIDs.Channels, logger);
const migratedGuildsClient = await createRedisClient(DatabaseIDs.MigratedGuilds, logger);
// Handover markers are only read by the premium bot's hot path
const premiumPendingClient = config.isPremiumInstance
  ? await createRedisClient(DatabaseIDs.PremiumPending, logger)
  : null;

export const Redis: {
  Channels: RedisClient;
  MigratedGuilds: RedisClient;
  PremiumPending: RedisClient | null;
} = {
  Channels: channelsClient,
  MigratedGuilds: migratedGuildsClient,
  PremiumPending: premiumPendingClient,
};
