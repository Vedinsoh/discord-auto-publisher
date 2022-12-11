import type { GuildChannel } from 'discord.js-light';
import client from '#client';
import safeErrorCodes from '#constants/safeErrorCodes';
import type { ReceivedMessage } from '#types/MessageTypes';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';

const crosspost = async (message: ReceivedMessage) => {
  const channel = message.channel as GuildChannel;

  if (await client.rateLimits.isLimited(channel.id)) return client.spam.check(channel);

  return message
    .crosspost()
    .then(() => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      logger.debug(`Published ${message.id} in ${channelToString(channel)} - ${guildToString(message.guild!)}`);
    })
    .catch(async (error) => {
      if (Object.prototype.hasOwnProperty.call(error, 'code')) {
        if (safeErrorCodes.includes(error.code)) return;
      }
      await client.spam.check(channel);
      await client.rateLimits.add(channel.id);
    });
};

export default crosspost;
