import axios, { AxiosError } from 'axios';
import urlRegex from 'url-regex-safe';
import PQueue from 'p-queue';
import { GuildChannel, Message } from 'discord.js-light';
import client from '#client';
import Spam from '#modules/SpamManager';
import logger from '#util/logger';
import { channelToString, guildToString } from '#util/stringFormatters';
import { CrosspostErrorType } from '#types/CrosspostErrorType';
import { intervals } from '#config';
// import debugLog from './debugLog';

const crosspostsQueue = new PQueue({ concurrency: 50 });
const delayedCrossposts = new Set();

const crosspostRequest = async (message: Message) => {
  crosspostsQueue.add(() => {
    const channel = message.channel as GuildChannel;
    if (Spam.rateLimitCheck(channel)) return;
  
    const { http } = client.options;
    if (!http) return;
  
    axios.post(
      `${http.api}/v${http.version}/channels/${channel.id}/messages/${message.id}/crosspost`, {}, {
        headers: {
          Authorization: `Bot ${process.env.BOT_TOKEN}`,
        },
      })
      .then(() => logger.debug(`Published ${message.id} in ${channelToString(channel)} - ${guildToString(message.guild)}`))
      .catch((error: AxiosError) => {
        const data = error?.response?.data as CrosspostErrorType;
        logger.debug(data);
  
        if (data.retry_after) {
          if (!Spam.rateLimitCheck(channel)) {
            return Spam.addSpamChannel(channel, data.retry_after);
          }
        }
        logger.error(error.stack);
      });
  });
};

export default async (message: Message, update = false) => {
  if (!intervals.urlDetection) return crosspostRequest(message);

  const delayCrosspost = () => {
    if (delayedCrossposts.has(message.id)) {
      crosspostRequest(message);
      delayedCrossposts.delete(message.id);
    }
  };

  if (update) return delayCrosspost();

  if (urlRegex({ strict: true, localhost: false }).test(message.content) && !message.embeds.length) {
    delayedCrossposts.add(message.id);
    setTimeout(() => delayCrosspost(), intervals.urlDelay * 1000);
    return;
  }
  crosspostRequest(message);
};
