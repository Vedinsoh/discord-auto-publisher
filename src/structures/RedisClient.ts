import { createClient } from 'redis';

export default class RedisClient {
  public client: ReturnType<typeof createClient>;
  constructor(private databaseId: number) {
    this.client = createClient({
      socket: {
        port: process.env.REDIS_PORT ?? 6379,
      },
    });
  }

  async start() {
    await this.client.connect();
    await this.client.select(this.databaseId);
  }
}

export enum keys {
  BLACKLIST = 'blacklist',
  SPAM_CHANNEL = 'spam_channel',
  RATE_LIMITED = 'rate_limited',
}
