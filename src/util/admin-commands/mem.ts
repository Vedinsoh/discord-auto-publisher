import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';
import { getMemoryUsage } from '#util/memory';

export default new AdminCommand(CommandNames.MEM, async ({ channel }) => {
  channel.send(`${await getMemoryUsage()} MB`);
});
