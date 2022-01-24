import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import Spam from '#modules/SpamManager';

export default new Command('blacklist', async ({ channel }: Message, guildId: string) => {
  // TODO
  // Spam.blacklistUpdate('add', guildId).then(response => channel.send(response));
});
