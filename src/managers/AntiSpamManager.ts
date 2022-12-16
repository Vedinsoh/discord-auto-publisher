import type { GuildChannel, Snowflake } from 'discord.js';
import client from '#client';
import config from '#config';
import dbIds from '#constants/redisDatabaseIds';
import expirations from '#constants/redisExpirations';
import RedisClient, { keys } from '#structures/RedisClient';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';

const { antiSpam } = config;
const EXPIRATION = expirations.SPAM_CHANNELS;
const getKey = (channelId: Snowflake) => `${keys.SPAM_CHANNEL}:${channelId}`;

class AntiSpamManager extends RedisClient {
  constructor() {
    super(dbIds.SPAM_CHANNELS);
  }

  private _logRateLimited(channel: GuildChannel, count: number) {
    logger.debug(
      `Channel ${channelToString(channel)} is being rate limited: ${10 + count}/${antiSpam.messagesThreshold}`
    );
  }

  private async _add(channel: GuildChannel) {
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

  private async _isSpamming(channel: GuildChannel) {
    if (!antiSpam.enabled) return false;

    const KEY = getKey(channel.id);
    const spamChannel = await this.client.get(KEY);
    if (!spamChannel) return false;

    const currentCount = parseInt(spamChannel);
    const newCount = currentCount + 1;
    await this.client.setEx(KEY, EXPIRATION, String(newCount));

    if (newCount >= antiSpam.messagesThreshold - 10) {
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

  public async check(channel: GuildChannel) {
    if (await this._isSpamming(channel)) return;
    return this._add(channel);
  }
}

export default AntiSpamManager;
