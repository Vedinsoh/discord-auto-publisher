import respawnClusters from '#functions/respawnClusters';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.RESPAWN, async ({ channel }) => {
  channel.send('Respawning all clusters...');
  respawnClusters();
});
