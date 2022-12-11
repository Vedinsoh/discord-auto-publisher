import { RedisClientType, createClient } from 'redis';

abstract class RedisClient {
  public client: RedisClientType;

  constructor(databaseId: number) {
    this.client = createClient({
      database: databaseId,
      url: process.env.REDIS_URL,
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

export default RedisClient;
