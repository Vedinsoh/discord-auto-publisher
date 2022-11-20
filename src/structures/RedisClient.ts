import { RedisClientType, createClient } from 'redis';

export default abstract class RedisClient {
  public client: RedisClientType;

  constructor(databaseId: number) {
    this.client = createClient({
      database: databaseId,
      socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT ?? 6379),
      },
    });
  }

  public async connect() {
    return this.client.connect();
  }
}

export enum keys {
  BLACKLIST = 'blacklist',
  SPAM_CHANNEL = 'spam_channel',
  RATE_LIMITED = 'rate_limited',
}
