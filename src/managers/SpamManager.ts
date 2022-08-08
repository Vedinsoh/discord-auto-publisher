import { GuildChannel, Snowflake } from 'discord.js-light';
import client from '#client';
import config from '#config';
import dbIds from '#constants/redisDatabaseIds';
import expirations from '#constants/redisExpirations';
import RedisBaseManager from '#managers/RedisBaseManager';
import { keys } from '#structures/RedisClient';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';

const { spam } = config;
const EXPIRATION = expirations.SPAM_CHANNELS;
const getKey = (channelId: Snowflake) => `${keys.SPAM_CHANNEL}:${channelId}`;

export default class SpamManager extends RedisBaseManager {
  constructor() {
    super(dbIds.SPAM_CHANNELS);
  }

  private logRateLimited(channel: GuildChannel, count: number) {
    logger.debug(`Channel ${channelToString(channel)} is being rate limited: ${10 + count}/${spam.messagesThreshold}`);
  }

  async add(channel: GuildChannel) {
    const KEY = getKey(channel.id);
    const spamChannel = await this.redisClient.get(KEY);

    if (spamChannel) {
      const currentCount = parseInt(spamChannel);
      return await this.redisClient.setEx(KEY, EXPIRATION, String(currentCount + 1));
    }

    await this.redisClient.setEx(KEY, EXPIRATION, '1');
    this.logRateLimited(channel, 1);
  }

  async isSpamming(channel: GuildChannel) {
    const KEY = getKey(channel.id);
    const spamChannel = await this.redisClient.get(KEY);
    if (!spamChannel || !spam.enabled) return false;

    const currentCount = parseInt(spamChannel);
    const newCount = currentCount + 1;
    await this.redisClient.setEx(KEY, EXPIRATION, String(newCount));

    if (newCount >= spam.messagesThreshold - 10) {
      logger.info(
        `${channelToString(channel)} in ${guildToString(channel.guild)} hit the hourly spam limit (${
          spam.messagesThreshold
        }).`
      );
      const { guild } = channel;
      this.redisClient.del(KEY);
      client.blacklist.add(guild.id);
      return true;
    }

    this.logRateLimited(channel, newCount);
    return true;
  }

  async check(channel: GuildChannel) {
    if (await this.isSpamming(channel)) return;
    await this.add(channel);
    return;
  }
}
