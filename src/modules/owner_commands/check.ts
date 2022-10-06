import { Message, Snowflake } from 'discord.js-light';
import { Command } from '#structures/Command';
import Blacklist from '#modules/BlacklistManager';

export default new Command('check', async ({ channel }: Message, guildId?: Snowflake) => {
  if (!guildId) return channel.send('Please provide server ID.');
  channel.send(`Server is ${!(await Blacklist.isBlacklisted(guildId)) ? 'not ' : ''}blacklisted.`);
});