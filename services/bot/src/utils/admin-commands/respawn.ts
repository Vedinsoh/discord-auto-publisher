import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';
import respawnClusters from '#utils/respawnClusters';

export default new AdminCommand(CommandNames.RESPAWN, async ({ channel }) => {
  await channel.send('Respawning all clusters...');
  respawnClusters();
});
