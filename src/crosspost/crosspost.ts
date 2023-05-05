import { DiscordAPIError, NewsChannel } from 'discord.js';
import client from '#client';
import safeErrorCodes from '#constants/safeErrorCodes';
import type { ReceivedMessage } from '#types/MessageTypes';
import { channelToString, guildToString } from '#util/stringFormatters';

const crosspost = async (message: ReceivedMessage) => {
  const channel = message.channel as NewsChannel;

  if (await client.antiSpam.isFlagged(message.channelId)) {
    client.antiSpam.increment(channel.id);
    return;
  }

  return message
    .crosspost()
    .then(() => {
      client.logger.debug(
        `Published ${message.id} in ${channelToString(channel)} - ${guildToString(message.guild, channel.guildId)}`
      );
    })
    .catch((error: DiscordAPIError | unknown) => {
      if (error instanceof DiscordAPIError) {
        const code = typeof error.code === 'string' ? parseInt(error.code) : error.code;
        if (safeErrorCodes.includes(code)) return;
      }
    });
};

export default crosspost;
