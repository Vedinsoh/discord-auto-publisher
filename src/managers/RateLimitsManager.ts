import type { Snowflake } from 'discord.js';
import dbIds from '#constants/redisDatabaseIds';
import expirations from '#constants/redisExpirations';
import RedisClient, { Keys } from '#structures/RedisClient';
import logger from '#util/logger';

const EXPIRATION = expirations.RATE_LIMITS;
const getKey = (channelId: Snowflake) => `${Keys.RateLimited}:${channelId}`;

class RateLimitsManager extends RedisClient {
  constructor() {
    super(dbIds.RATE_LIMITS);
  }

  async isLimited(channelId: Snowflake | null) {
    if (!channelId) return false;
    return this.client.get(getKey(channelId));
  }

  async add(channelId: Snowflake) {
    await this.client.setEx(getKey(channelId), EXPIRATION, String(Date.now()));
    logger.debug(`Rate limited ${channelId}`);
  }
}

export default RateLimitsManager;
