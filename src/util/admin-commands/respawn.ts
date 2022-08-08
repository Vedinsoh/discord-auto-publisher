import { Message } from 'discord.js-light';
import respawnClusters from '#functions/respawnClusters';
import { Command } from '#structures/Command';

export default new Command('respawn', async ({ channel }: Message) => {
  channel.send('Respawning all clusters...');
  respawnClusters();
});
