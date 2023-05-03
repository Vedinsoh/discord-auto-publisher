import { RedisClientType, createClient } from 'redis';
import config from '#config';

export abstract class RedisClient {
  public client: RedisClientType;

  constructor(databaseId = 0) {
    this.client = createClient({
      database: databaseId,
      url: config.redisUri,
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
