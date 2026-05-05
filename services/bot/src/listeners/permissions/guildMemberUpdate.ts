import { ChannelType, Events } from 'discord.js';
import client from '#client';
import { Services } from '#services';
import Event from '#structures/Event';

/**
 * Bot member updated (typically a role change). Recompute permissions for every
 * announcement channel in the guild and invalidate any newly-allowed entries.
 */
export default new Event(Events.GuildMemberUpdate, async (_oldMember, newMember) => {
  if (newMember.id !== client.user?.id) return;
  for (const channel of newMember.guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildAnnouncement) continue;
    await Services.Permissions.refreshChannel(channel);
  }
});
