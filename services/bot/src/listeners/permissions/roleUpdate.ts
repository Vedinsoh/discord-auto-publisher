import { ChannelType, Events } from 'discord.js';
import { Services } from '#services';
import Event from '#structures/Event';

/**
 * A role's permissions or position changed. If the bot has this role, channel-level
 * effective permissions for the bot may have changed; refresh announcement channels
 * in the affected guild.
 */
export default new Event(Events.GuildRoleUpdate, async (oldRole, newRole) => {
  const me = newRole.guild.members.me;
  if (!me?.roles.cache.has(newRole.id)) return;
  for (const channel of newRole.guild.channels.cache.values()) {
    if (channel.type !== ChannelType.GuildAnnouncement) continue;
    await Services.Permissions.refreshChannel(channel);
  }
});
