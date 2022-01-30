import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import { BlacklistActions } from '#types/BlacklistTypes';
import client from '#client';

export default new Command('unblacklist', async ({ channel }: Message, guildId: string) => {
  if (!guildId) return channel.send('Please provide server ID');
  client.cluster.blacklist.update(BlacklistActions.REMOVE, guildId).then((response) => channel.send(response));
  // Spam.blacklistUpdate(BlacklistActions.REMOVE, guildId).then((response) => channel.send(response));
});
