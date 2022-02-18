import { GuildChannel, Message, PartialMessage } from 'discord.js-light';
import urlRegex from 'url-regex-safe';
import client from '#client';
import { minToMs, secToMs } from '#util/timeConverters';
import { channelToString, guildToString } from '#util/stringFormatters';
import logger from '#util/logger';
import { urlDetection } from '#config';

const { spam: spamChannels } = client.cluster;
const delayedCrossposts = new Set();

const rateLimitedChannels = new Map<string, number>();
// Sweep interval for rateLimitedChannels
setInterval(() => {
  rateLimitedChannels.forEach((timestamp, id) => {
    if (Date.now() > timestamp + minToMs(5)) rateLimitedChannels.delete(id);
  });
}, minToMs(5));

const crosspostRequest = async (message: Message | PartialMessage) => {
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

export default async (message: Message | PartialMessage, options = { isUpdate: false }) => {
  if (!urlDetection.enabled) return crosspostRequest(message);

  const delayCrosspost = () => {
    if (delayedCrossposts.has(message.id)) {
      crosspostRequest(message);
      delayedCrossposts.delete(message.id);
    }
  };

  if (options.isUpdate) return delayCrosspost();

  if (message.content) {
    if (urlRegex({ strict: true, localhost: false }).test(message.content) && !message.embeds.length) {
      delayedCrossposts.add(message.id);
      setTimeout(() => delayCrosspost(), secToMs(urlDetection.publishDelay));
      return;
    }
  }
  crosspostRequest(message);
};
