import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';
import { userToString } from '#util/stringFormatters';

export default new AdminCommand(CommandNames.BLACKLIST, async ({ channel, author }, guildId) => {
  if (!guildId) {
    channel.send('Please provide server ID.');
    return;
  }

  await client.blacklist
    .add(guildId, {
      reason: `Blacklisted by ${userToString(author)}`,
    })
    .then((response) => {
      channel.send(response);
      client.logger.info(response);
    });
});
