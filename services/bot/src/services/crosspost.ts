import { type Message, type NewsChannel } from 'discord.js';
import urlRegex from 'url-regex-safe';
import { Data } from '#data';
import { Services } from '#services';
import type { ReceivedMessage } from '#types/MessageTypes';
import { sleep } from '#utils/common';
import { logger } from '#utils/logger';
import { secToMs } from '#utils/timeConverters';

/**
 * Handles the message for crossposting
 * @param message Message object
 * @param channel NewsChannel object
 */
const handle = async (message: Message, channel: NewsChannel) => {
  // Synchronous, cache-only permission check. discord.js auto-populates `members.me`,
  // role cache, and channel permission overwrites from GUILD_CREATE / *_UPDATE events.
  if (!Services.Permissions.canCrosspostInChannel(channel)) return;

  // If message has no text content, crosspost immediately
  if (!message.content) {
    return push(message);
  }

  // Defer crossposting if the message has a URL but no embeds
  const hasUrl = urlRegex({ strict: true, localhost: false }).test(message.content);
  const hasEmbeds = Boolean(message.embeds.length);
  if (hasUrl && !hasEmbeds) {
    await sleep(secToMs(5));
  }

  return push(message);
};

/**
 * Sends a message to the proxy for crossposting. The proxy ACKs immediately with 202
 * and processes asynchronously via its BullMQ queue, so this fetch returns in <100ms
 * regardless of Discord's rate-limit state.
 */
const push = async (message: ReceivedMessage) => {
  try {
    return await Data.API.Proxy.pushCrosspost(message.channel.id, message.id);
  } catch (error) {
    logger.warn(
      { event: 'crosspost.push_failed', channelId: message.channel.id, messageId: message.id, err: error },
      'Failed to push crosspost to proxy',
    );
    return;
  }
};

export const Crosspost = { handle, push };
