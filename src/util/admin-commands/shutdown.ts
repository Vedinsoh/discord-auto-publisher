import shutdown from '#functions/shutdown';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.SHUTDOWN, async ({ channel }) => {
  await channel.send('Shutting down...');
  await shutdown();
});
