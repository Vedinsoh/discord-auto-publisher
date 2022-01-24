import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import Spam from '#modules/SpamManager';

export default new Command('unblacklist', async ({ channel }: Message, guildId: string) => {
  /* TODO
	Spam.blacklistUpdate('remove', guildId)
    .then(response => channel.send(response));
	*/
});
