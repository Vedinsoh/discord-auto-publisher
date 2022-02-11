import { Message } from 'discord.js-light';
import client from '#client';
import { AutoPublisherClient } from '#structures/Client';
import { Command } from '#structures/Command';

export default new Command('uptime', async ({ channel }: Message) => {
  const uptimes = await client.cluster.broadcastEval((c: AutoPublisherClient) => c.uptime);

  const formattedUptimes = uptimes
    .reverse()
    .map((uptime, index) => `#${index + 1}: ${uptime ? new Date(Date.now() - uptime).toISOString() : 'unknown'}`);

  channel.send(`Up since:\n${formattedUptimes.join('\n')}`);
});
