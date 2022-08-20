import type { createClient } from 'redis';
import RedisClient from '#structures/RedisClient';

export default class RedisBaseManager {
  private baseClient: RedisClient;
  public redisClient: ReturnType<typeof createClient>;

  constructor(databaseId: number) {
    const baseClient = new RedisClient(databaseId);
    this.baseClient = baseClient;
    this.redisClient = baseClient.client;
  }

  async start() {
    await this.baseClient.start();
  }
}
