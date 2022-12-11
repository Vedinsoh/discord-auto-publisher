import type { GuildChannel, Snowflake } from 'discord.js';
import client from '#client';
import config from '#config';
import dbIds from '#constants/redisDatabaseIds';
import expirations from '#constants/redisExpirations';
import RedisClient, { keys } from '#structures/RedisClient';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';

const { spam } = config;
const EXPIRATION = expirations.SPAM_CHANNELS;
const getKey = (channelId: Snowflake) => `${keys.SPAM_CHANNEL}:${channelId}`;

class SpamManager extends RedisClient {
  constructor() {
    super(dbIds.SPAM_CHANNELS);
  }

  private _logRateLimited(channel: GuildChannel, count: number) {
    logger.debug(`Channel ${channelToString(channel)} is being rate limited: ${10 + count}/${spam.messagesThreshold}`);
  }

  async add(channel: GuildChannel) {
    const KEY = getKey(channel.id);
    const spamChannel = await this.client.get(KEY);

    if (spamChannel) {
      const currentCount = parseInt(spamChannel);
      await this.client.setEx(KEY, EXPIRATION, String(currentCount + 1));
      return;
    }

    await this.client.setEx(KEY, EXPIRATION, '1');
    this._logRateLimited(channel, 1);
  }

  async isSpamming(channel: GuildChannel) {
    const KEY = getKey(channel.id);
    const spamChannel = await this.client.get(KEY);
    if (!spamChannel || !spam.enabled) return false;

    const currentCount = parseInt(spamChannel);
    const newCount = currentCount + 1;
    await this.client.setEx(KEY, EXPIRATION, String(newCount));

    if (newCount >= spam.messagesThreshold - 10) {
      logger.info(
        `${channelToString(channel)} in ${guildToString(channel.guild)} hit the hourly spam limit (${
          spam.messagesThreshold
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

  async check(channel: GuildChannel) {
    if (await this.isSpamming(channel)) return;
    await this.add(channel);
    return;
  }
}

export default SpamManager;
