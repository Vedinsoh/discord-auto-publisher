import urlRegex from 'url-regex-safe';
import { Data } from '#data';
import type { ReceivedMessage } from '#types/MessageTypes';
import { delay } from '#utils/common';
import { secToMs } from '#utils/timeConverters';

/**
 * Sends a message to the REST service to crosspost
 * @param message Message to crosspost
 */
const push = async (message: ReceivedMessage) => {
  // If URL detection is disabled or the message has no content, crosspost immediately
  if (!message.content) {
    await Data.API.REST.pushCrosspost(message.channel.id, message.id);
    return;
  }

  // Check if the message has a URL and no embeds
  const hasUrl = urlRegex({ strict: true, localhost: false }).test(message.content);
  const hasEmbeds = Boolean(message.embeds.length);

  // Defer crossposting if the message has a URL but no embeds
  if (hasUrl && !hasEmbeds) {
    await delay(secToMs(5));
  }

  await Data.API.REST.pushCrosspost(message.channel.id, message.id);
};

export const Crosspost = { push };
