import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.RLSIZE, async ({ channel }) => {
  client.antiSpam
    .getSize()
    .then((size) => {
      channel.send(`Rate limited channels size: ${size}`);
    })
    .catch((error) => {
      channel.send('Error fetching rate limited channels size');
      client.logger.error(error);
    });
});
