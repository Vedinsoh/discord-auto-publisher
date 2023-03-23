import { ChannelType, Events } from 'discord.js';
import client from '#client';
import config from '#config';
import handleCrosspost from '#crosspost/handleCrosspost';
import Event from '#structures/Event';
import type { CommandNames } from '#types/AdminCommandTypes';

const { botAdmin } = config;

export default new Event(Events.MessageCreate, async (message) => {
  let { channel } = message;

  if (channel.partial) channel = await message.channel.fetch();
  if (!channel) return;

  if (channel.type === ChannelType.GuildAnnouncement) return handleCrosspost(message);

  // * Bot owner commands handler
  if (channel.type === ChannelType.DM && message.author.id === botAdmin) {
    const [commandName, argument] = message.content //
      .toLowerCase()
      .split(/ +/g)
      .splice(0, 2);

    const command = client.commands.get(commandName as CommandNames);
    if (command) command(message, argument);
  }
});
