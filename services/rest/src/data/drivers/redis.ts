import { createClient, type RedisClientType } from 'redis';

import { env } from '@/utils/config';

// Redis database IDs
export enum DatabaseIDs {
  CrosspostsCounter,
  RequestLimits,
}

// Redis keys
export enum Keys {
  InvalidRequest = 'invalid_request',
  Crosspost = 'crosspost',
}

/**
 * @class Redis
 * @description Redis driver
 * @param {number} databaseId - Database ID
 * @property {RedisClientType} client - Redis client
 */
export class Client {
  public client: RedisClientType;
  private _databaseId: number;

  // Initialize Redis client
  constructor(databaseId: number) {
    this._databaseId = databaseId;
    this.client = createClient({
      database: databaseId,
      url: env.REDIS_URI,
    });
  }

  // Connect to Redis
  public async connect() {
    try {
      await this.client.connect();
      console.log(`Connected to Redis database ${this._databaseId}`);
    } catch (error) {
      console.error(`Error connecting to Redis ${this._databaseId}:`, error);
      throw new Error(error as string);
    }
  }

  // Disconnect from Redis
  public async disconnect() {
    try {
      await this.client.disconnect();
      console.log(`Disconnected from Redis database ${this._databaseId}`);
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
      throw new Error(error as string);
    }
  }
}

export const Redis = {
  Client,
  DatabaseIDs,
  Keys,
};
