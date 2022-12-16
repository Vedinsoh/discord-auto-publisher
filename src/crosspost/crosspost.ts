import type { NewsChannel } from 'discord.js';
import client from '#client';
import safeErrorCodes from '#constants/safeErrorCodes';
import type { ReceivedMessage } from '#types/MessageTypes';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';

const crosspost = async (message: ReceivedMessage) => {
  const channel = message.channel as NewsChannel;

  if (await client.rateLimits.isLimited(channel.id)) return client.antiSpam.check(channel);

  return message
    .crosspost()
    .then(() => {
      logger.debug(
        `Published ${message.id} in ${channelToString(channel)} - ${guildToString(message.guild, channel.guildId)}`
      );
    })
    .catch(async (error) => {
      if (Object.prototype.hasOwnProperty.call(error, 'code')) {
        if (safeErrorCodes.includes(error.code)) return;
      }
      await client.antiSpam.check(channel);
      await client.rateLimits.add(channel.id);
    });
};

export default crosspost;
