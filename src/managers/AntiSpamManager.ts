import type { NewsChannel, Snowflake } from 'discord.js';
import client from '#client';
import config from '#config';
import dbIds from '#constants/redisDatabaseIds';
import expirations from '#constants/redisExpirations';
import RedisClient, { Keys } from '#structures/RedisClient';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';

const { antiSpam } = config;
const EXPIRATION = expirations.SPAM_CHANNELS;

class AntiSpamManager extends RedisClient {
  constructor() {
    super(dbIds.SPAM_CHANNELS);
  }

  private _createKey(channelId: Snowflake) {
    return this.separateKeys([Keys.SpamChannel, channelId]);
  }

  private _logRateLimited(channel: NewsChannel, count: number) {
    const normalizedCount = count + antiSpam.rateLimitsThreshold + 10;
    logger.debug(
      `Channel ${channelToString(channel)} is being rate limited: ${normalizedCount}/${antiSpam.messagesThreshold}`
    );
  }

  private async _add(channel: NewsChannel) {
    await channel.fetch();

    const KEY = this._createKey(channel.id);
    const spamChannel = await this.client.get(KEY);

    if (spamChannel) return this.client.incr(KEY);

    this._logRateLimited(channel, 1);
    return this.client.setEx(KEY, EXPIRATION, '1');
  }

  private async _isSpamming(channel: NewsChannel) {
    const KEY = this._createKey(channel.id);
    const spamChannel = await this.client.get(KEY);
    if (!spamChannel) return false;

    const currentCount = parseInt(spamChannel);
    const newCount = currentCount + 1;
    await this.client.incr(KEY);

    if (newCount >= antiSpam.messagesThreshold - antiSpam.rateLimitsThreshold - 10) {
      logger.info(
        `${channelToString(channel)} in ${guildToString(channel.guild, channel.guildId)} hit the hourly spam limit (${
          antiSpam.messagesThreshold
        }).`
      );
      const { guild } = channel;
      this.client.del(KEY);
      client.blacklist.add(guild.id);
      return true;
    }

    this._logRateLimited(channel, newCount);
    return true;
  }

  public async check(channel: NewsChannel) {
    if (!antiSpam.enabled) return;

    if (await this._isSpamming(channel)) return;
    return this._add(channel);
  }
}

export default AntiSpamManager;
