import type { NewsChannel, Snowflake } from 'discord.js';
import client from '#client';
import config from '#config';
import dbIds from '#constants/redisDatabaseIds';
import expirations from '#constants/redisExpirations';
import RedisClient, { Keys } from '#structures/RedisClient';
import type { ReceivedMessage } from '#types/MessageTypes';

const EXPIRATION = expirations.RATE_LIMITS;

class RateLimitsManager extends RedisClient {
  constructor() {
    super(dbIds.RATE_LIMITS);
  }

  private _createKey(message: ReceivedMessage) {
    return this.separateKeys([Keys.RateLimited, message.channelId, message.id]);
  }

  private _createChannelKey(channelId: Snowflake) {
    return this.separateKeys([Keys.RateLimited, channelId, '*']);
  }

  async isLimited(message: ReceivedMessage) {
    const channelKey = this._createChannelKey(message.channelId);
    const keys = await this.client.keys(channelKey);
    const isAtLimit = keys.length >= config.antiSpam.rateLimitsThreshold;

    if (isAtLimit) {
      client.antiSpam.check(message.channel as NewsChannel);
    }

    return isAtLimit;
  }

  async add(message: ReceivedMessage) {
    await this.client.setEx(this._createKey(message), EXPIRATION, 'rate limited');
    client.logger.debug(`Rate limited ${message.channelId}`);
  }
}

export default RateLimitsManager;
