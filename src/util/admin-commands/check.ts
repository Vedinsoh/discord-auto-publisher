import { Message, Snowflake } from 'discord.js-light';
import client from '#client';
import { Command } from '#structures/Command';

export default new Command('check', async ({ channel }: Message, guildId?: Snowflake) => {
  if (!guildId) return channel.send('Please provide server ID.');
  channel.send(`Server is ${!(await client.blacklist.has(guildId)) ? 'not ' : ''}blacklisted.`);
});
