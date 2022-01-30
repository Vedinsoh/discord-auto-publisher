import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import client from '#client';

export default new Command('unblacklist', async ({ channel }: Message, guildId: string) => {
  if (!guildId) return channel.send('Please provide server ID');
  client.cluster.blacklist.remove(guildId).then((response) => channel.send(response));
});
