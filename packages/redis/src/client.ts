import { env } from '@ap/config';
import type { Logger } from '@ap/logger';
import { Redis, type RedisOptions } from 'ioredis';

export type RedisClient = Redis;

interface CreatedClient {
  databaseId: number;
  client: RedisClient;
  logger?: Logger;
}

const clients: CreatedClient[] = [];

/**
 * Create and connect a Redis client for a specific logical DB.
 * Connection is eager (ioredis connects on construction); the returned Promise
 * resolves once the client emits `ready`.
 */
export const createRedisClient = async (
  databaseId: number,
  logger?: Logger,
  options?: Omit<RedisOptions, 'db' | 'lazyConnect'>
): Promise<RedisClient> => {
  const client = new Redis(env.REDIS_URI, {
    db: databaseId,
    maxRetriesPerRequest: null,
    ...options,
  });

  client.on('error', (error: Error) => {
    logger?.warn({ event: 'redis.error', databaseId, err: error }, 'Redis client error');
  });

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      client.off('error', onError);
      logger?.info({ event: 'redis.connected', databaseId }, `Connected to Redis DB ${databaseId}`);
      resolve();
    };
    const onError = (error: Error) => {
      client.off('ready', onReady);
      reject(error);
    };
    client.once('ready', onReady);
    client.once('error', onError);
  });

  clients.push({ databaseId, client, logger });
  return client;
};

/**
 * Gracefully disconnect every client previously created by `createRedisClient`.
 * Safe to call multiple times.
 */
export const disconnectAllRedis = async (): Promise<void> => {
  await Promise.all(
    clients.splice(0).map(async ({ databaseId, client, logger }) => {
      try {
        await client.quit();
        logger?.info(
          { event: 'redis.disconnected', databaseId },
          `Disconnected Redis DB ${databaseId}`
        );
      } catch (error) {
        logger?.warn({ event: 'redis.disconnect_failed', databaseId, err: error });
      }
    })
  );
};
