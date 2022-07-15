import { Constants, Message } from 'discord.js-light';
import { Event } from '#structures/Event';
import crosspost from '#functions/crosspost';
import client from '#client';
import config from '#config';

const { botAdmin } = config;

export default new Event(Constants.Events.MESSAGE_CREATE, async (message: Message) => {
  const { channel } = message;

  if (channel.partial) await message.channel.fetch();
  if (!channel) return;

  if (channel.type === 'GUILD_NEWS') return crosspost(message);

  // Bot owner commands handler
  if (channel.type === 'DM' && message.author.id === botAdmin) {
    const [commandName, argument] = message.content.toLowerCase().split(/ +/g).splice(0, 2);

    const command = client.commands.get(commandName);
    if (command) command(message, argument);
  }
});
