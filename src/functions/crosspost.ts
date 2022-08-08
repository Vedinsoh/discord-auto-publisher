import { GuildChannel, Message, PartialMessage, Snowflake } from 'discord.js-light';
import urlRegex from 'url-regex-safe';
import client from '#client';
import config from '#config';
import safeErrorCodes from '#constants/safeErrorCodes';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';
import { secToMs } from '#util/timeConverters';

const { urlDetection } = config;
const deferredMessages = new Set<Snowflake>();

type MessageType = Message | PartialMessage;

const deferCheck = (message: MessageType) => {
  if (deferredMessages.has(message.id)) {
    crosspost(message);
    deferredMessages.delete(message.id);
  }
};

const crosspost = async (message: MessageType) => {
  const channel = message.channel as GuildChannel;

  if (await client.rateLimits.isLimited(channel.id)) return await client.spam.check(channel);

  message
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

// Checks if crosspost request should be sent in the first place
export default async (message: MessageType, options = { isUpdate: false }) => {
  if (options.isUpdate) return deferCheck(message);
  if (urlDetection.enabled && message.content) {
    const hasUrl = urlRegex({ strict: true, localhost: false }).test(message.content);
    const hasEmbeds = message.embeds.length;
    if (hasUrl && !hasEmbeds) {
      deferredMessages.add(message.id);
      setTimeout(() => deferCheck(message), secToMs(urlDetection.deferTimeout));
      return;
    }
  }
  crosspost(message);
};
