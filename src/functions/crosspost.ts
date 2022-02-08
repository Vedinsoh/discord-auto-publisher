import axios, { AxiosError } from 'axios';
import urlRegex from 'url-regex-safe';
import { RouteBases, Routes } from 'discord-api-types/rest/v9';
import { GuildChannel, Message, PartialMessage } from 'discord.js-light';
import client from '#client';
import { CrosspostsQueue } from '#structures/CrosspostsQueue';
import errorHandler from '#functions/errorHandler';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';
import { secToMs } from '#util/timeConverters';
import { urlDetection } from '#config';

const delayedCrossposts = new Set();
const queue = new CrosspostsQueue();

const crosspostRequest = async (message: Message | PartialMessage) => {
  const channel = message.channel as GuildChannel;

  if (client.cluster.spam.isSpamming(channel)) return;

  queue.add(() => {
    axios.post(
      `${RouteBases.api}${Routes.channelMessageCrosspost(channel.id, message.id)}`, {}, {
        headers: {
          Authorization: `Bot ${process.env.BOT_TOKEN}`,
        },
      })
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .then(() => logger.debug(`Published ${message.id} in ${channelToString(channel)} - ${guildToString(message.guild!)}`))
      .catch((error: AxiosError) => errorHandler(channel, error));
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
