import { createClient, type RedisClientType } from 'redis';
import { env } from '../config.js';
import { logger } from '../logger.js';

export type RedisClient = RedisClientType;

const clients: { databaseId: number; client: RedisClient }[] = [];

export const createRedisClient = async (databaseId: number): Promise<RedisClient> => {
  const client = createClient({ database: databaseId, url: env.REDIS_URI }) as RedisClient;
  client.on('error', (error) => {
    logger.warn({ event: 'redis.error', databaseId, err: error }, 'Redis client error');
  });
  await client.connect();
  logger.info({ event: 'redis.connected', databaseId }, 'Connected to Redis');
  clients.push({ databaseId, client });
  return client;
};

export const disconnectAllRedis = async () => {
  await Promise.all(
    clients.map(async ({ databaseId, client }) => {
      try {
        await client.disconnect();
        logger.info({ event: 'redis.disconnected', databaseId });
      } catch (error) {
        logger.warn({ event: 'redis.disconnect_failed', databaseId, err: error });
      }
    }),
  );
};
