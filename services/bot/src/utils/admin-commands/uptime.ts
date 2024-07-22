import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';
import { getDiscordFormat } from '#utils/timeConverters';

export default new AdminCommand(CommandNames.UPTIME, async ({ channel }) => {
  const uptimes = await client.cluster.broadcastEval((c) => c.uptime);
  const formattedUptimes = uptimes.map(
    (uptime, index) => `Cluster ${index + 1} - ${uptime ? `<t:${getDiscordFormat(Date.now() - uptime)}:f>` : 'unknown'}`
  );

  channel.send(formattedUptimes.join('\n'));
});
