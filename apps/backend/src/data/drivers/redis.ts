import { createRedisClient, DatabaseIDs, type RedisClient } from '@ap/redis';
import { logger } from 'utils/logger.js';

const channelsClient = await createRedisClient(DatabaseIDs.Channels, logger);
const migratedGuildsClient = await createRedisClient(DatabaseIDs.MigratedGuilds, logger);
const discordAuthClient = await createRedisClient(DatabaseIDs.DiscordAuth, logger);
const paddleWebhookDedupeClient = await createRedisClient(DatabaseIDs.PaddleWebhookDedupe, logger);
const legacyGuildPermsClient = await createRedisClient(DatabaseIDs.LegacyGuildPerms, logger);

export const Redis: {
  client: RedisClient;
  MigratedGuilds: RedisClient;
  DiscordAuth: RedisClient;
  PaddleWebhookDedupe: RedisClient;
  LegacyGuildPerms: RedisClient;
} = {
  client: channelsClient,
  MigratedGuilds: migratedGuildsClient,
  DiscordAuth: discordAuthClient,
  PaddleWebhookDedupe: paddleWebhookDedupeClient,
  LegacyGuildPerms: legacyGuildPermsClient,
};
