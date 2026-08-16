import { type Message, MessageFlags, type NewsChannel, type Snowflake } from 'discord.js';
import urlRegex from 'url-regex-safe';
import { Data } from '#data';
import { Services } from '#services';
import type { ReceivedMessage } from '#types/MessageTypes';
import { sleep } from '#utils/common';
import { logger } from '#utils/logger';
import { secToMs } from '#utils/timeConverters';

/**
 * Returns true if Discord will reject this message with code 50068 (Invalid Message Type)
 * or 40033 (Already Crossposted). Filtering here avoids enqueueing work that would always
 * fail downstream and burn Discord requests for nothing.
 */
const isCrosspostable = (message: Message): boolean => {
  if (message.system) return false;
  if (message.flags.has(MessageFlags.IsCrosspost)) return false;
  if (message.flags.has(MessageFlags.Crossposted)) return false;
  return true;
};

/**
 * Handles the message for crossposting
 * @param message Message object
 * @param channel NewsChannel object
 */
const handle = async (message: Message, channel: NewsChannel) => {
  // Pre-filter messages Discord would reject as un-crosspostable (system messages,
  // already-crossposted, forwarded). Saves a queue round-trip and avoids burning
  // Discord requests on guaranteed failures.
  if (!isCrosspostable(message)) return;

  // Synchronous, cache-only permission check. discord.js auto-populates `members.me`,
  // role cache, and channel permission overwrites from GUILD_CREATE / *_UPDATE events.
  if (!Services.Permissions.canCrosspostInChannel(channel)) return;

  // If message has no text content, crosspost immediately
  if (!message.content) {
    return push(message, channel.guildId);
  }

  // Defer crossposting if the message has a URL but no embeds
  const hasUrl = urlRegex({ strict: true, localhost: false }).test(message.content);
  const hasEmbeds = Boolean(message.embeds.length);
  if (hasUrl && !hasEmbeds) {
    await sleep(secToMs(5));
  }

  return push(message, channel.guildId);
};

// guildId comes from the NewsChannel, not `message.guildId`: `ReceivedMessage` may be
// partial, where guildId is nullable.
const push = async (message: ReceivedMessage, guildId: Snowflake) => {
  try {
    return await Data.API.Proxy.enqueueCrosspost(guildId, message.channel.id, message.id);
  } catch (error) {
    logger.warn(
      { event: 'crosspost.push_failed', guildId, channelId: message.channel.id, messageId: message.id, err: error },
      'Failed to enqueue crosspost on proxy',
    );
    return;
  }
};

export const Crosspost = { handle, push };
