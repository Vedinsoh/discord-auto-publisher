import { Message } from 'discord.js-light';
import shutdown from '#functions/shutdown';
import { Command } from '#structures/Command';

export default new Command('shutdown', async ({ channel }: Message) => {
  await channel.send('Shutting down...');
  shutdown();
});
