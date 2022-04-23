import { Message } from 'discord.js-light';
import { Event } from '#structures/Event';
import crosspost from '#functions/crosspost';
import client from '#client';
import { botAdmin } from '#config';

export default new Event('messageCreate', async (message: Message) => {
  if (message.channel.partial) await message.channel.fetch();
  if (message.channel.type === 'GUILD_NEWS') return crosspost(message);

  // Bot owner commands handler
  if (message.channel.type === 'DM' && message.author.id === botAdmin) {
    const [commandName, argument] = message.content.toLowerCase().split(/ +/g).splice(0, 2);

    const command = client.commands.get(commandName);
    if (command) command(message, argument);
  }
});
