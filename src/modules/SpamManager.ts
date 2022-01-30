import { GuildChannel } from 'discord.js-light';
import client from '#client';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';
import { spam } from '#config';

export default class SpamManager {
  spamChannels: Map<string, { count: number }> = new Map();

  constructor() {
    // setInterval(() => console.log('test'), 5000);
  }

  logRateLimited(channel: GuildChannel, count: number) {
    logger.info(`Channel ${channelToString(channel)} is being rate limited: ${10 + count}/${spam.messagesThreshold}`);
  }

  addChannel(channel: GuildChannel, timeout: number) {
    const spamChannel = this.spamChannels.get(channel.id);
    if (spamChannel) return spamChannel.count++;

    this.spamChannels.set(channel.id, { count: 1 });
    this.logRateLimited(channel, 11);

    setTimeout(() => {
      this.spamChannels.delete(channel.id);
      logger.debug(`Rate limit counter reset for ${channelToString(channel)}`);
    }, timeout);
  }

  isSpamming(channel: GuildChannel): boolean | void {
    const spamChannel = this.spamChannels.get(channel.id);
    if (!spamChannel || !spam.enabled) return false;

    spamChannel.count++;
    if (spamChannel.count >= spam.messagesThreshold - 10) {
      logger.info(
        `${channelToString(channel)} in ${guildToString(channel.guild)} hit the hourly spam limit (${
          spam.messagesThreshold
        }).`
      );
      const { guild } = channel;
      this.spamChannels.delete(channel.id);
      client.cluster.blacklist.add(guild.id);
      return true;
    }

    this.logRateLimited(channel, spamChannel.count);
    return true;
  }
}
