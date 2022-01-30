import { Message } from 'discord.js-light';
import { Event } from '#structures/Event';
import crosspost from '#functions/crosspost';
import client from '#client';
import { botAdmin } from '#config';

export default new Event('messageCreate', async (message: Message) => {
  if (message.channel.type === 'GUILD_NEWS') crosspost(message);

  console.log(client.cluster.spam.spamChannels);
  

  // Bot owner commands handler
  if (message.channel.type === 'DM' && message.author.id === botAdmin) {
    const [commandName, argument] = message.content.toLowerCase().split(/ +/g).splice(0, 2);

    const command = client.commands.get(commandName);
    if (!command) return;
    command(message, argument);
  }
});
