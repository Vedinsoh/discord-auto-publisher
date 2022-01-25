import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import Spam from '#modules/SpamManager';
import getGuild from '#functions/getGuild';

export default new Command('check', async ({ channel }: Message, guildId: string) => {
  const guild = await getGuild(guildId);

  if (!guild) return channel.send('Unknown guild.');
  channel.send(`Server is ${!Spam.isBlacklisted(guild) ? 'not ' : ''}blacklisted.`);
});
