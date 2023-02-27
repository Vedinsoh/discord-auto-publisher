import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.BLACKLIST, async ({ channel }, guildId) => {
  if (!guildId) {
    channel.send('Please provide server ID.');
    return;
  }

  await client.blacklist //
    .add(guildId)
    .then((response) => {
      channel.send(response);
      client.logger.info(response);
    });
});
