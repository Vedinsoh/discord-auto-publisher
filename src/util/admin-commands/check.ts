import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.CHECK, async ({ channel }, guildId) => {
  if (!guildId) return channel.send('Please provide server ID.');
  channel.send(`Server is ${!(await client.blacklist.has(guildId)) ? 'not ' : ''}blacklisted.`);
});
