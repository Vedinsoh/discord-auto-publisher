import { type GuildBasedChannel, PermissionsBitField } from 'discord.js';
import { Data } from '#data';
import { logger } from '#utils/logger';

const REQUIRED_FLAGS = [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages] as const;

/**
 * Synchronous, cache-only permission check for crosspost eligibility.
 * Returns true only if the bot's cached GuildMember has both SendMessages and ManageMessages
 * in the channel based on currently-cached roles + permission overwrites.
 */
const canCrosspostInChannel = (channel: GuildBasedChannel): boolean => {
  const me = channel.guild.members.me;
  if (!me) return false;
  const perms = channel.permissionsFor(me);
  if (!perms) return false;
  return REQUIRED_FLAGS.every((flag) => perms.has(flag));
};

/**
 * Recompute crosspost eligibility for a single channel and clear the proxy's
 * cant-post cache entry if the bot now has permission.
 */
const refreshChannel = async (channel: GuildBasedChannel) => {
  if (canCrosspostInChannel(channel)) {
    await Data.API.Proxy.clearCantPost(channel.id).catch((err) =>
      logger.warn({ event: 'permissions.clear_cant_post_failed', channelId: channel.id, err }),
    );
  }
};

export const Permissions = { canCrosspostInChannel, refreshChannel };
