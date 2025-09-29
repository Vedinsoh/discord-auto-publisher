import { env } from 'lib/config/env.js';
import { createClient, type RedisClientType } from 'redis';
import { Logger } from 'services/logger.js';

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
      url: 'redis://bot-api-cache:6379',
    });
  }

  // Connect to Redis
  public async connect() {
    try {
      await this.client.connect();
      Logger.info(`Connected to Redis database ${this._databaseId}`);
    } catch (error) {
      Logger.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error connecting to Redis ${this._databaseId}: ${errorMessage}`);
    }
  }

  // Disconnect from Redis
  public async disconnect() {
    try {
      await this.client.disconnect();
      Logger.info(`Disconnected from Redis database ${this._databaseId}`);
    } catch (error) {
      Logger.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error disconnecting from Redis: ${errorMessage}`);
    }
  }
}

export const Redis = {
  Client,
};
