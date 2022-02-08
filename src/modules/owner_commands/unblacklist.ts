import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import Blacklist from '#modules/BlacklistManager';

export default new Command('unblacklist', async ({ channel }: Message, guildId?: string) => {
  if (!guildId) return channel.send('Please provide server ID.');
  await Blacklist.remove(guildId).then((response) => channel.send(response));
});
