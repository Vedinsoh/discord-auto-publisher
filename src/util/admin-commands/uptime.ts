import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.UPTIME, async ({ channel }) => {
  const uptimes = await client.cluster.broadcastEval((c) => c.uptime);

  const formattedUptimes = uptimes.map(
    (uptime, index) => `#${index + 1}: ${uptime ? new Date(Date.now() - uptime).toISOString() : 'unknown'}`
  );

  channel.send(`Up since:\n${formattedUptimes.join('\n')}`);
});
