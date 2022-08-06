import { GuildChannel, Message, PartialMessage, Snowflake } from 'discord.js-light';
import client from '#client';
import config from '#config';
import errorCodes from '#util/errorCodes';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';
import { minToMs, secToMs } from '#util/timeConverters';
import urlRegex from 'url-regex-safe';

const { urlDetection } = config;

const { spamChannels } = client.cluster;
const rateLimitedChannels = new Map<Snowflake, number>();
const deferredMessages = new Set<Snowflake>();

// Sweep interval for rateLimitedChannels
setInterval(() => {
  const now = Date.now();
  rateLimitedChannels.forEach((timestamp, id) => {
    if (now > timestamp + minToMs(5)) rateLimitedChannels.delete(id);
  });
}, minToMs(5));

const crosspost = async (message: Message | PartialMessage) => {
  const channel = message.channel as GuildChannel;
  if (rateLimitedChannels.has(channel.id)) return spamChannels.check(channel);
  message
    .crosspost()
    .then(() => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      logger.debug(`Published ${message.id} in ${channelToString(channel)} - ${guildToString(message.guild!)}`);
    })
    .catch((error) => {
      if (Object.prototype.hasOwnProperty.call(error, 'code')) {
        if (errorCodes.includes(error.code)) return;
      }
      spamChannels.check(channel);
      rateLimitedChannels.set(channel.id, Date.now());
    });
};

const deferCheck = (message: Message | PartialMessage) => {
  if (deferredMessages.has(message.id)) {
    crosspost(message);
    deferredMessages.delete(message.id);
  }
};

// Checks if crosspost request should be sent in the first place
export default async (message: Message | PartialMessage, options = { isUpdate: false }) => {
  if (options.isUpdate) return deferCheck(message);
  if (urlDetection.enabled && message.content) {
    if (urlRegex({ strict: true, localhost: false }).test(message.content) && !message.embeds.length) {
      deferredMessages.add(message.id);
      setTimeout(() => deferCheck(message), secToMs(urlDetection.deferTimeout));
      return;
    }
  }
  crosspost(message);
};
