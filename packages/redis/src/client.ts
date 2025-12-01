import type { Logger } from '@ap/logger';
import { createClient, type RedisClientType } from 'redis';

export class RedisClient {
  public client: RedisClientType;
  private _databaseId: number;
  private _logger: Logger;

  constructor(databaseId: number, logger: Logger, url = 'redis://redis:6379') {
    this._databaseId = databaseId;
    this._logger = logger;
    this._url = url;
    this.client = createClient({
      database: databaseId,
      url,
    });
  }

  public async connect() {
    try {
      await this.client.connect();
      this._logger.info(`Connected to Redis database ${this._databaseId}`);
    } catch (error) {
      this._logger.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error connecting to Redis ${this._databaseId}: ${errorMessage}`);
    }
  }

  public async disconnect() {
    try {
      await this.client.disconnect();
      this._logger.info(`Disconnected from Redis database ${this._databaseId}`);
    } catch (error) {
      this._logger.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Error disconnecting from Redis: ${errorMessage}`);
    }
  }
}
