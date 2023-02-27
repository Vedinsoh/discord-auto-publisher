import type { NewsChannel } from 'discord.js';
import client from '#client';
import safeErrorCodes from '#constants/safeErrorCodes';
import type { ReceivedMessage } from '#types/MessageTypes';
import { channelToString, guildToString } from '#util/stringFormatters';

const crosspost = async (message: ReceivedMessage) => {
  const channel = message.channel as NewsChannel;

  if (await client.rateLimits.isLimited(message)) return;

  return message
    .crosspost()
    .then(() => {
      client.logger.debug(
        `Published ${message.id} in ${channelToString(channel)} - ${guildToString(message.guild, channel.guildId)}`
      );
    })
    .catch((error) => {
      if (Object.prototype.hasOwnProperty.call(error, 'code')) {
        if (safeErrorCodes.includes(error.code)) return;
      }
      client.rateLimits.add(message);
    });
};

export default crosspost;
