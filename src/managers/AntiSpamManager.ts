import type { NewsChannel, Snowflake } from 'discord.js';
import client from '#client';
import config from '#config';
import { Keys, RedisClient } from '#structures/RedisClient';
import { channelToString, guildToString } from '#util/stringFormatters';
import { minToSec } from '#util/timeConverters';

const { antiSpam } = config;

class AntiSpamManager extends RedisClient {
  private _createKey(channelId: Snowflake) {
    return this.joinKeys([Keys.SpamChannel, channelId]);
  }

  public async add(channel: NewsChannel) {
    const KEY = this._createKey(channel.id);
    const isStored = await this.client.get(KEY);

    client.crosspostQueue.clearChannelQueue(channel.id);

    if (isStored) {
      await this.client.incr(KEY);
      return this._atThreshold(channel);
    }

    this._logRateLimited(channel, 1);
    await this.client.setEx(KEY, minToSec(60), '1');
    return;
  }

  public async isFlagged(channelId: Snowflake) {
    if (!antiSpam.enabled) return false;

    const KEY = this._createKey(channelId);
    const isStored = await this.client.get(KEY);

    return Boolean(isStored);
  }

  private async _atThreshold(channel: NewsChannel) {
    const KEY = this._createKey(channel.id);
    const storedCount = await this.client.get(KEY);
    if (!storedCount) return;

    const parsedCount = parseInt(storedCount);

    if (parsedCount >= antiSpam.messagesThreshold - 10) {
      client.logger.info(
        `${channelToString(channel)} in ${guildToString(channel.guild, channel.guildId)} hit the hourly spam limit (${
          antiSpam.messagesThreshold
        }).`
      );
      this._handleCleanup(channel);
      return;
    }

    this._logRateLimited(channel, parsedCount);
  }

  private async _handleCleanup(channel: NewsChannel) {
    const KEY = this._createKey(channel.id);
    const { guild } = channel;

    await this.client.del(KEY);
    return client.blacklist.add(guild.id, {
      reason: `Spam limit hit (${antiSpam.messagesThreshold}) in ${channelToString(channel)}`,
    });
  }

  private async _logRateLimited(channel: NewsChannel, count: number) {
    await channel.fetch();
    const normalizedCount = count + 10;

    client.logger.debug(
      `Channel ${channelToString(channel)} is being rate limited: ${normalizedCount}/${antiSpam.messagesThreshold}`
    );
  }
}

export default AntiSpamManager;
