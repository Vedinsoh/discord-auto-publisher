import { ChannelType, Events, PermissionsBitField } from 'discord.js';
import client from '#client';
import config from '#config';
import preconditionRun from '#crosspost/preconditionRun';
import Event from '#structures/Event';
import type { CommandNames } from '#types/AdminCommandTypes';

export default new Event(Events.MessageCreate, async (message) => {
  let { channel } = message;

  if (channel.partial) channel = await message.channel.fetch();
  if (!channel) return;

  if (channel.type === ChannelType.GuildAnnouncement) {
    const botMember = await message.guild?.members.me?.fetch();
    const permissionsBitfield = botMember?.permissionsIn(channel);

    if (!permissionsBitfield?.has(PermissionsBitField.Flags.ManageMessages)) return;
    return preconditionRun(message);
  }

  // * Bot owner commands handler
  if (channel.type === ChannelType.DM && config.botAdmins.includes(message.author.id)) {
    const [commandName, argument] = message.content //
      .toLowerCase()
      .split(/ +/g)
      .splice(0, 2);

    const command = client.commands.get(commandName as CommandNames);
    if (command) command(message, argument);
  }
});
