import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';
import shutdown from '#utils/shutdown';

export default new AdminCommand(CommandNames.SHUTDOWN, async ({ channel }) => {
  await channel.send('Shutting down...');
  shutdown();
});
