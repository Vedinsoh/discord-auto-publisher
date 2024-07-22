import urlRegex from 'url-regex-safe';
import config from '#config';
import { Services } from '#services';
import type { ReceivedMessage } from '#types/MessageTypes';
import { delay } from '#utils/delay';
import { secToMs } from '#utils/timeConverters';

const { urlDetection } = config;

/**
 * Sends a message to the REST service to crosspost
 * @param message Message to crosspost
 */
const push = async (message: ReceivedMessage) => {
  // If URL detection is disabled or the message has no content, crosspost immediately
  if (!urlDetection.enabled || !message.content) {
    return Services.REST.pushCrosspost(message.channel.id, message.id);
  }

  // Check if the message has a URL and no embeds
  const hasUrl = urlRegex({ strict: true, localhost: false }).test(message.content);
  const hasEmbeds = Boolean(message.embeds.length);

  // Defer crossposting if the message has a URL but no embeds
  if (hasUrl && !hasEmbeds) {
    await delay(secToMs(urlDetection.deferTimeout));
  }

  return Services.REST.pushCrosspost(message.channel.id, message.id);
};

export const Crosspost = { push };
