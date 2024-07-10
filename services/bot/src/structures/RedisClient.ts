import { type RedisClientType, createClient } from 'redis';
import config from '#config';

export abstract class RedisClient {
  public client: RedisClientType;

  constructor(databaseId: number) {
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

export enum Databases {
  AntiSpam,
  RequestLimits,
  Crossposts,
}

export enum Keys {
  SpamChannel = 'spam_channel',
  InvalidRequest = 'invalid_request',
  Crosspost = 'crosspost',
}
