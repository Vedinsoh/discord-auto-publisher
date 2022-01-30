import { GuildChannel } from 'discord.js-light';
import client from '#client';
import { channelToString, guildToString } from '#util/stringFormatters';
import logger from '#util/logger';
import { BlacklistActions, SpamChannelsMap } from '#types/BlacklistTypes';
import { spam } from '#config';

export default class SpamManager {
  spamChannels: SpamChannelsMap = new Map();

  logRateLimited(channel: GuildChannel, count: number) {
    logger.info(`Channel ${channelToString(channel)} is being rate limited: ${10 + count}/${spam.messagesHourlyLimit}`);
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
    if (!spamChannel || !spam.monitoringEnabled) return false;

    spamChannel.count++;
    if (spamChannel.count >= spam.messagesHourlyLimit - 10) {
      logger.info(
        `${channelToString(channel)} in ${guildToString(channel.guild)} hit the hourly spam limit (${
          spam.messagesHourlyLimit
        }).`
      );
      const { guild } = channel;
      this.spamChannels.delete(channel.id);
      client.cluster.blacklist.update(BlacklistActions.ADD, guild.id);
      return true;
    }

    this.logRateLimited(channel, spamChannel.count);
    return true;
  }
}
