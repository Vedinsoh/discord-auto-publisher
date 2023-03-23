import { RedisClientType, createClient } from 'redis';

export abstract class RedisClient {
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

  public joinKeys(keys: string[]) {
    return keys.join(':');
  }
}

export enum Keys {
  Blacklist = 'blacklist',
  SpamChannel = 'spam_channel',
}
