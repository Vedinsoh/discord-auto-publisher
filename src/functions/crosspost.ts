import { GuildChannel, Message, PartialMessage } from 'discord.js-light';
import urlRegex from 'url-regex-safe';
import client from '#client';
import { minToMs, secToMs } from '#util/timeConverters';
import { channelToString, guildToString } from '#util/stringFormatters';
import logger from '#util/logger';
import { urlDetection } from '#config';

const { spam: spamChannels } = client.cluster;
const rateLimitedChannels = new Map<string, number>();
const deferredMessages = new Set();

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
    .catch(() => {
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

// Checks if crospost request should be sent in the first place
export default async (message: Message | PartialMessage, options = { isUpdate: false }) => {
  if (options.isUpdate) return deferCheck(message);
  if (urlDetection.enabled && message.content) {
    if (urlRegex({ strict: true, localhost: false }).test(message.content) && !message.embeds.length) {
      deferredMessages.add(message.id);
      setTimeout(() => deferCheck(message), secToMs(urlDetection.publishDelay));
      return;
    }
  }
  crosspost(message);
};
