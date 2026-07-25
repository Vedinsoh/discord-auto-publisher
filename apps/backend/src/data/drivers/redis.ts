import { createRedisClient, DatabaseIDs, type RedisClient } from '@ap/redis';
import { logger } from 'utils/logger.js';

const channelsClient = await createRedisClient(DatabaseIDs.Channels, logger);
// MIGRATION: MigratedGuilds client + all its usages removed at sunset (DB 5 retired).
const migratedGuildsClient = await createRedisClient(DatabaseIDs.MigratedGuilds, logger);
const discordAuthClient = await createRedisClient(DatabaseIDs.DiscordAuth, logger);
const paddleWebhookDedupeClient = await createRedisClient(DatabaseIDs.PaddleWebhookDedupe, logger);
const alertsClient = await createRedisClient(DatabaseIDs.Alerts, logger);
const premiumPendingClient = await createRedisClient(DatabaseIDs.PremiumPending, logger);
const publishStateClient = await createRedisClient(DatabaseIDs.PublishState, logger);

export const Redis: {
  client: RedisClient;
  MigratedGuilds: RedisClient;
  DiscordAuth: RedisClient;
  PaddleWebhookDedupe: RedisClient;
  Alerts: RedisClient;
  PremiumPending: RedisClient;
  PublishState: RedisClient;
} = {
  client: channelsClient,
  MigratedGuilds: migratedGuildsClient,
  DiscordAuth: discordAuthClient,
  PaddleWebhookDedupe: paddleWebhookDedupeClient,
  Alerts: alertsClient,
  PremiumPending: premiumPendingClient,
  PublishState: publishStateClient,
};
