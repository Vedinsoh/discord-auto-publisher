import { Message } from 'discord.js-light';
import shutdown from '#util/shutdown';
import { Command } from '#structures/Command';

export default new Command('shutdown', async ({ channel }: Message) => {
  channel.send('Shutting down...');
  shutdown();
});
