import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import Spam from '#modules/SpamManager';
import { BlacklistActions } from '#types/BlacklistTypes';

export default new Command('blacklist', async ({ channel }: Message, guildId: string) => {
  if (!guildId) return channel.send('Please provide server ID');
  Spam.blacklistUpdate(BlacklistActions.ADD, guildId).then((response) => channel.send(response));
});
