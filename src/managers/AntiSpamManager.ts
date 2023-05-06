import type { NewsChannel, Snowflake } from 'discord.js';
import client from '#client';
import config from '#config';
import { Keys, RedisClient } from '#structures/RedisClient';
import type { SublimitedChannel } from '#types/SublimitData';
import { channelToString, guildToString } from '#util/stringFormatters';
import { minToSec, msToSec } from '#util/timeConverters';

const { antiSpam } = config;

class AntiSpamManager extends RedisClient {
  private _createKey(channelId: Snowflake) {
    return this.joinKeys([Keys.SpamChannel, channelId]);
  }

  public async add(data: SublimitedChannel) {
    const KEY = this._createKey(data.channelId);
    const isStored = await this.client.get(KEY);

    if (isStored) {
      await this.client.incr(KEY);
      return this._atThreshold(data.channelId);
    }

    this._logRateLimited(data.channelId, 1);
    await this.client.setEx(KEY, Math.ceil(msToSec(data.sublimit)), '1');
  }

  public async increment(channelId: Snowflake) {
    const KEY = this._createKey(channelId);
    const isStored = await this.client.get(KEY);

    if (!isStored) {
      await this.client.setEx(KEY, minToSec(60), '1');
      return;
    }

    await this.client.incr(KEY);
    this._atThreshold(channelId);
  }

  public async isFlagged(channelId: Snowflake) {
    if (!antiSpam.enabled) return false;

    const KEY = this._createKey(channelId);
    const isStored = await this.client.get(KEY);

    return Boolean(isStored);
  }

  public async getCount(channelId: Snowflake) {
    const KEY = this._createKey(channelId);
    const count = await this.client.get(KEY);

    return count ? parseInt(count) : null;
  }

  public async ttl(channelId: Snowflake) {
    const KEY = this._createKey(channelId);
    const ttl = await this.client.ttl(KEY);

    return ttl;
  }

  private async _atThreshold(channelId: Snowflake) {
    const channel = (await client.channels.fetch(channelId)) as NewsChannel;
    if (!channel) return;

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
      this._cleanup(channel);
      return;
    }

    this._logRateLimited(channelId, parsedCount);
  }

  private async _cleanup(channel: NewsChannel) {
    const KEY = this._createKey(channel.id);
    const { guild } = channel;

    await this.client.del(KEY);
    return client.blacklist.add(guild.id, {
      reason: `Spam limit hit (${antiSpam.messagesThreshold}) in ${channelToString(channel)}`,
    });
  }

  private async _logRateLimited(channelId: Snowflake, count: number) {
    const channel = (await client.channels.fetch(channelId)) as NewsChannel;
    if (!channel) return;

    const normalizedCount = count + 10;

    client.logger.debug(
      `Channel ${channelToString(channel)} is being rate limited: ${normalizedCount}/${antiSpam.messagesThreshold}`
    );
  }

  public async flushChannels() {
    return this.client.flushDb();
  }

  public async getSize() {
    return this.client.dbSize();
  }
}

export default AntiSpamManager;
