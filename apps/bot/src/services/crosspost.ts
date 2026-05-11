import { RegExPatterns, secToMs, sleep } from '@ap/utils';
import { Data } from 'data/index.js';
import { type Message, MessageFlags, type NewsChannel } from 'discord.js';
import { logger } from 'utils/logger.js';
import { Services } from './index.js';

/**
 * Whether a message can be crossposted at all (system/already-crossposted checks).
 */
const isCrosspostable = (message: Message): boolean => {
  if (message.system) return false;
  if (message.flags.has(MessageFlags.IsCrosspost)) return false;
  if (message.flags.has(MessageFlags.Crossposted)) return false;
  return true;
};

/**
 * Handles the message for crossposting.
 * Pipeline:
 *  1. crosspostable bit-flag check
 *  2. sync permission check (cache-only)
 *  3. allowlist gate for migrated guilds (Redis: MigratedGuilds + Channels)
 *  4. premium filter eval (HTTP to backend)
 *  5. 5s delay if URL without embed (lets Discord generate embeds first)
 *  6. fire-and-forget to proxy
 */
const handle = async (message: Message, channel: NewsChannel) => {
  if (!isCrosspostable(message)) return;
  if (!Services.Permissions.canCrosspostInChannel(channel)) return;

  if (await Services.Guild.isMigrated(channel.guildId)) {
    if (!(await Services.Channel.isEnabled(channel.id))) return;
  }

  const passesFilters = await Services.Filter.evaluate(message, channel);
  if (!passesFilters) return;

  if (!message.content) return push(message);

  const hasEmbeds = Boolean(message.embeds.length);
  const hasUrl = RegExPatterns.url.test(message.content);

  if (hasUrl && !hasEmbeds) {
    await sleep(secToMs(5));
  }

  return push(message);
};

const push = async (message: Message): Promise<Response | undefined> => {
  try {
    return await Data.API.Proxy.enqueueCrosspost(message.channel.id, message.id);
  } catch (error) {
    logger.warn(
      {
        event: 'crosspost.push_failed',
        channelId: message.channel.id,
        messageId: message.id,
        err: error,
      },
      'Failed to enqueue crosspost'
    );
    return undefined;
  }
};

export const Crosspost = { handle, push, isCrosspostable };
