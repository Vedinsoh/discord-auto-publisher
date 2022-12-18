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

export enum Keys {
  Blacklist = 'blacklist',
  SpamChannel = 'spam_channel',
  RateLimited = 'rate_limited',
}

export default RedisClient;
