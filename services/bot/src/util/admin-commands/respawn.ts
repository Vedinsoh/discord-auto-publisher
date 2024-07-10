import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';
import respawnClusters from '#util/respawnClusters';

export default new AdminCommand(CommandNames.RESPAWN, async ({ channel }) => {
  channel.send('Respawning all clusters...');
  respawnClusters();
});
