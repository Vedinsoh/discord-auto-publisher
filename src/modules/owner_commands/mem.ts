import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import { getMemoryUsage } from '#util/memory';

export default new Command('mem', async ({ channel }: Message) => {
  channel.send(`${getMemoryUsage()} MB`);
});
