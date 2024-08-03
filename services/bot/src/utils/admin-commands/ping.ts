import { performance } from 'node:perf_hooks';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.PING, async ({ channel }) => {
  const perfStart = performance.now();
  await channel.send(`Measuring...`);
  const perfEnd = performance.now();

  channel.send(`**Ping:** ${Math.ceil(perfEnd - perfStart)}ms`);
});
