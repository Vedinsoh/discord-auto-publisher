import { ChannelType, Events } from 'discord.js';
import { Constants } from '#constants/index';
import { Services } from '#services';
import Event from '#structures/Event';

/**
 * Event handler for the messageCreate event
 */
export default new Event(Events.MessageCreate, async (message) => {
  // Get the channel data
  const channel = await Services.Channel.fetch(message.channel);
  if (!channel) return;

  // Announcement channel handler
  if (channel.type === ChannelType.GuildAnnouncement) {
    Services.Crosspost.handle(message, channel);
    return;
  }

  // Admin commands handler
  if (channel.type === ChannelType.DM && Constants.AdminCommands.adminIds.includes(message.author.id)) {
    Services.AdminCommands.handle(message);
    return;
  }
});
