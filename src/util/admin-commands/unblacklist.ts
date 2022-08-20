import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';
import logger from '#util/logger';

export default new AdminCommand(CommandNames.UNBLACKLIST, async ({ channel }, guildId) => {
  if (!guildId) {
    channel.send('Please provide server ID.');
    return;
  }

  await client.blacklist.remove(guildId).then((response) => {
    channel.send(response);
    logger.info(response);
  });
});
