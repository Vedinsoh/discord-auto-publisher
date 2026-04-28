import { createClient, type RedisClientType } from 'redis';
import { env } from '../config.js';
import { logger } from '../logger.js';

export class Client {
  public client: RedisClientType;
  private databaseId: number;

  constructor(databaseId: number) {
    this.databaseId = databaseId;
    this.client = createClient({
      database: databaseId,
      url: env.REDIS_URI,
    });
    this.client.on('error', (error) => {
      logger.warn({ event: 'redis.error', databaseId: this.databaseId, err: error }, 'Redis client error');
    });
  }

  public async connect() {
    await this.client.connect();
    logger.info({ event: 'redis.connected', databaseId: this.databaseId }, 'Connected to Redis');
  }

  public async disconnect() {
    await this.client.disconnect();
    logger.info({ event: 'redis.disconnected', databaseId: this.databaseId }, 'Disconnected from Redis');
  }
}
