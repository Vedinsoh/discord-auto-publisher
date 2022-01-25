import { Message } from 'discord.js-light';
import { Command } from '#structures/Command';
import respawnClusters from '#functions/respawnClusters';

export default new Command('mem', async ({ channel }: Message) => {
  channel.send('Respawning all clusters...');
  respawnClusters();
});
