import { Data } from 'data/index.js';
import { type GuildBasedChannel, PermissionsBitField } from 'discord.js';
import { logger } from 'utils/logger.js';

const REQUIRED_FLAGS = [
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.ManageMessages,
] as const;

const canCrosspostInChannel = (channel: GuildBasedChannel): boolean => {
  const me = channel.guild.members.me;
  if (!me) return false;
  const perms = channel.permissionsFor(me);
  if (!perms) return false;
  return REQUIRED_FLAGS.every(flag => perms.has(flag));
};

const refreshChannel = async (channel: GuildBasedChannel) => {
  if (!canCrosspostInChannel(channel)) return;
  try {
    await Data.API.Proxy.clearBlocked(channel.id);
  } catch (err) {
    logger.warn(
      { event: 'permissions.clear_blocked_failed', channelId: channel.id, err },
      'Failed to clear blocked cache'
    );
  }
};

export const Permissions = { canCrosspostInChannel, refreshChannel };
