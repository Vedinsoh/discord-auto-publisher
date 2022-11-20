import type { Snowflake } from 'discord.js-light';
import dbIds from '#constants/redisDatabaseIds';
import expirations from '#constants/redisExpirations';
import RedisClient, { keys } from '#structures/RedisClient';
import logger from '#util/logger';

const EXPIRATION = expirations.RATE_LIMITS;
const getKey = (channelId: Snowflake) => `${keys.RATE_LIMITED}:${channelId}`;

export default class RateLimitsManager extends RedisClient {
  constructor() {
    super(dbIds.RATE_LIMITS);
  }

  async isLimited(channelId: Snowflake) {
    return this.client.get(getKey(channelId));
  }

  async add(channelId: Snowflake) {
    await this.client.setEx(getKey(channelId), EXPIRATION, String(Date.now()));
    logger.debug(`Rate limited ${channelId}`);
  }
}
