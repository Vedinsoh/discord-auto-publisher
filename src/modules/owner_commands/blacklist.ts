import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import client from '#client';

export default new Command('blacklist', async ({ channel }: Message, guildId: string) => {
  if (!guildId) return channel.send('Please provide server ID.');
  await client.cluster.blacklist.add(guildId).then((response) => channel.send(response));
});
