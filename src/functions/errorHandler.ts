import { GuildChannel } from 'discord.js-light';
import { AxiosError } from 'axios';
import client from '#client';
import logger from '#util/logger';
import { secToMs } from '#util/timeConverters';
import { channelToString, guildToString } from '#util/stringFormatters';
import { CrosspostErrorType } from '#types/CrosspostErrorType';

export default (channel: GuildChannel, error: AxiosError) => {
  const { guild } = channel;
  const data = error?.response?.data as CrosspostErrorType;

  if (data.code === 50013) {
    return logger.debug(`${data.message} Channel ${channelToString(channel)} in ${guildToString(guild)}`);
  }

  if (data.retry_after) {
    // Double rate limit check due to asnyc functions
    if (client.cluster.spam.isSpamming(channel)) return;
    return client.cluster.spam.addChannel(channel, secToMs(data.retry_after));
  }

  if (!data.message) return logger.error(error.stack);
  return logger.debug(`${data.message}\n Channel ${channelToString(channel)} in ${guildToString(guild)}`);
};
