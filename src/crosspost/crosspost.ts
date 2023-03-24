import { DiscordAPIError, NewsChannel, RateLimitError } from 'discord.js';
import client from '#client';
import safeErrorCodes from '#constants/safeErrorCodes';
import type { ReceivedMessage } from '#types/MessageTypes';
import { channelToString, guildToString } from '#util/stringFormatters';
import { secToMs } from '#util/timeConverters';

const crosspost = async (message: ReceivedMessage, retry = 0) => {
  const channel = message.channel as NewsChannel;

  if (await client.antiSpam.isFlagged(channel)) {
    if (retry > 0) return;
    return client.antiSpam.add(channel);
  }

  if (retry >= 5) {
    return client.antiSpam.add(channel);
  }

  return message
    .crosspost()
    .then(() => {
      client.logger.debug(
        `Published ${message.id} in ${channelToString(channel)} - ${guildToString(message.guild, channel.guildId)}`
      );
    })
    .catch((error: DiscordAPIError | RateLimitError | unknown) => {
      if (error instanceof RateLimitError) {
        setTimeout(() => {
          client.crosspostQueue.add(message, { retry: retry + 1 });
        }, secToMs(10));
        return;
      }

      if (error instanceof DiscordAPIError) {
        const code = typeof error.code === 'string' ? parseInt(error.code) : error.code;
        if (safeErrorCodes.includes(code)) return;
      }
    });
};

export default crosspost;
