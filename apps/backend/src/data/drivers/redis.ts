import { createRedisClient, DatabaseIDs, type RedisClient } from '@ap/redis';
import { logger } from 'utils/logger.js';

const channelsClient = await createRedisClient(DatabaseIDs.Channels, logger);
const migratedGuildsClient = await createRedisClient(DatabaseIDs.MigratedGuilds, logger);
const discordAuthClient = await createRedisClient(DatabaseIDs.DiscordAuth, logger);
const paddleWebhookDedupeClient = await createRedisClient(DatabaseIDs.PaddleWebhookDedupe, logger);
const legacyGuildPermsClient = await createRedisClient(DatabaseIDs.LegacyGuildPerms, logger);
const alertsClient = await createRedisClient(DatabaseIDs.Alerts, logger);
const premiumPendingClient = await createRedisClient(DatabaseIDs.PremiumPending, logger);

export const Redis: {
  client: RedisClient;
  MigratedGuilds: RedisClient;
  DiscordAuth: RedisClient;
  PaddleWebhookDedupe: RedisClient;
  LegacyGuildPerms: RedisClient;
  Alerts: RedisClient;
  PremiumPending: RedisClient;
} = {
  client: channelsClient,
  MigratedGuilds: migratedGuildsClient,
  DiscordAuth: discordAuthClient,
  PaddleWebhookDedupe: paddleWebhookDedupeClient,
  LegacyGuildPerms: legacyGuildPermsClient,
  Alerts: alertsClient,
  PremiumPending: premiumPendingClient,
};
