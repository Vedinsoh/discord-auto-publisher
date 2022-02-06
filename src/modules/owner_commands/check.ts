import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import Blacklist from '#modules/BlacklistManager';
import getGuild from '#functions/getGuild';

export default new Command('check', async (message: Message, guildId: string) => {
// export default new Command('check', async ({ channel }: Message, guildId: string) => {
  console.log(message);
  
  /*
  const guild = await getGuild(guildId);

  if (!guild) return channel.send('Unknown server.');
  channel.send(`Server is ${!await Blacklist.isBlacklisted(guild) ? 'not ' : ''}blacklisted.`);
  */
});
