import type { createClient } from 'redis';
import RedisClient from '#structures/RedisClient';

export default abstract class RedisBaseManager {
  private _baseClient: RedisClient;
  public redisClient: ReturnType<typeof createClient>;

  constructor(databaseId: number) {
    const baseClient = new RedisClient(databaseId);
    this._baseClient = baseClient;
    this.redisClient = baseClient.client;
  }

  async start() {
    await this._baseClient.start();
  }
}
