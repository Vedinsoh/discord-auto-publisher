import { ChannelType, Events } from 'discord.js';
import { Services } from '#services';
import Event from '#structures/Event';

/**
 * Channel permission overwrites changed. If the affected channel is an announcement
 * channel and the bot now has crosspost permission, clear any negative cache entry
 * so future messages will be sent through to Discord again.
 */
export default new Event(Events.ChannelUpdate, async (_oldChannel, newChannel) => {
  if (newChannel.isDMBased()) return;
  if (newChannel.type !== ChannelType.GuildAnnouncement) return;
  await Services.Permissions.refreshChannel(newChannel);
});
