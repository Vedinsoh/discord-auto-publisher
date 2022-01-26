import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import Spam from '#modules/SpamManager';
import { BlacklistActions } from '#types/BlacklistTypes';

export default new Command('unblacklist', async ({ channel }: Message, guildId: string) => {
  if (!guildId) return channel.send('Please provide server ID');
  Spam.blacklistUpdate(BlacklistActions.REMOVE, guildId).then((response) => channel.send(response));
});
