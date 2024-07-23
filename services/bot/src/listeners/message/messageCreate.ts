import { ChannelType, Events, PermissionsBitField } from 'discord.js';
import client from '#client';
import { Services } from '#services';
import Event from '#structures/Event';
import type { CommandNames } from '#types/AdminCommandTypes';
import { env } from '#utils/config';

const botAdmins = env.BOT_ADMINS.split(/,\s*/g);

// TODO separate the services
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

  // Bot owner commands handler
  if (channel.type === ChannelType.DM && botAdmins.includes(message.author.id)) {
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
