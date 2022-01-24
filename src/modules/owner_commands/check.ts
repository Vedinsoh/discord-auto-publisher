import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import Spam from '#modules/SpamManager';

export default new Command('check', async ({ channel }: Message, guildId: string) => {
  // TODO
  // channel.send(`Server is ${!Spam.blacklistCheck(guildId) ? 'not ' : ''}blacklisted.`);
});
