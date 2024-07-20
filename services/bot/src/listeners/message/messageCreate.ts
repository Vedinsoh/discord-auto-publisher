import { ChannelType, Events, PermissionsBitField } from 'discord.js';
import client from '#client';
import config from '#config';
import { Services } from '#services';
import Event from '#structures/Event';
import type { CommandNames } from '#types/AdminCommandTypes';

/**
 * Event handler for the messageCreate event
 */
export default new Event(Events.MessageCreate, async (message) => {
  // Get the channel data if it's partial
  let { channel } = message;
  if (channel.partial) channel = await message.channel.fetch();

  // Don't process further if the channel is not available
  if (!channel) return;

  // Announcement channel handler
  if (channel.type === ChannelType.GuildAnnouncement) {
    // Check if the bot has the necessary permissions to crosspost
    const botMember = await message.guild?.members.me?.fetch();
    const permissionsBitfield = botMember?.permissionsIn(channel);
    if (!permissionsBitfield?.has(PermissionsBitField.Flags.ManageMessages)) return;

    // Push the message to the crosspost service
    Services.Crosspost.push(message);
    return;
  }

  // TODO
  // Bot owner commands handler
  if (channel.type === ChannelType.DM && config.botAdmins.includes(message.author.id)) {
    // Get the command name and argument
    const [commandName, argument] = message.content //
      .toLowerCase()
      .split(/ +/g)
      .splice(0, 2);

    // Get the command and execute it
    const command = client.commands.get(commandName as CommandNames);
    if (command) command(message, argument);
  }
});
