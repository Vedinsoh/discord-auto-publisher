import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';
import shutdown from '#util/shutdown';

export default new AdminCommand(CommandNames.SHUTDOWN, async ({ channel }) => {
  await channel.send('Shutting down...');
  await shutdown();
});
