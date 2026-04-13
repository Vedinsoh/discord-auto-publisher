import { RegExPatterns, secToMs, sleep } from '@ap/utils';
import { Data } from 'data/index.js';
import { type Message, MessageFlags, type NewsChannel } from 'discord.js';
import type { ReceivedMessage } from 'lib/types/MessageTypes.js';
import { Services } from './index.js';

/**
 * Handles the message for crossposting
 * @param message Message object
 * @param channel NewsChannel object
 */
const handle = async (message: Message, channel: NewsChannel) => {
  // Skip if message is already crossposted
  if (message.flags.has(MessageFlags.Crossposted)) {
    return;
  }

  // Check if message passes filters
  const passesFilters = await Services.Filter.evaluate(message, channel);
  if (!passesFilters) {
    return;
  }

  // If message has no text content, crosspost immediately
  if (!message.content) {
    return push(message);
  }

  // Check if the message has a URL and no embeds
  const hasEmbeds = Boolean(message.embeds.length);
  const hasUrl = RegExPatterns.url.test(message.content);

  // Defer crossposting if the message has a URL but no embeds
  if (hasUrl && !hasEmbeds) {
    await sleep(secToMs(5));
  }

  // Push the message for crossposting
  return push(message);
};

/**
 * Sends a message to the REST service to crosspost
 * @param message Message to crosspost
 */
const push = async (message: ReceivedMessage) => {
  // MIGRATION: Added guildId parameter
  // TODO: After migration (6 months), remove guildId param
  if (!message.guildId) return;

  return await Data.API.CrosspostWorker.pushCrosspost(
    message.guildId,
    message.channel.id,
    message.id
  );
};

export const Crosspost = { handle, push };
