import { createClient, type RedisClientType } from 'redis';

import { env } from '@/utils/config';

export abstract class RedisClient {
  public client: RedisClientType;

  constructor(databaseId: number) {
    this.client = createClient({
      database: databaseId,
      url: env.REDIS_URI,
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
  CrosspostsCounter,
  RequestLimits,
  Crossposts,
}

export enum Keys {
  SpamChannel = 'spam_channel',
  InvalidRequest = 'invalid_request',
  Crosspost = 'crosspost',
}
