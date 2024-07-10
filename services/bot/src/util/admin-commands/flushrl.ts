import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.FLUSHRL, async ({ channel }) => {
  client.antiSpam
    .flushChannels()
    .then(() => {
      channel.send('Rate limited channels flushed');
      client.logger.debug('Rate limited channels flushed');
    })
    .catch((error) => {
      channel.send('Error flushing rate limited channels');
      client.logger.error(error);
    });
});
