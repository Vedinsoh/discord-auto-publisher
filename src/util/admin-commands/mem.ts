import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/CommandTypes';
import { getMemoryUsage } from '#util/memory';

export default new AdminCommand(CommandNames.MEM, async ({ channel }) => {
  channel.send(`${await getMemoryUsage()} MB`);
});
