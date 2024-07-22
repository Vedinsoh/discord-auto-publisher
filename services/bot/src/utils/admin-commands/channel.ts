import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';
import getChannel from '#utils/getChannel';
import { channelToString } from '#utils/stringFormatters';
import { secToMin } from '#utils/timeConverters';

export default new AdminCommand(CommandNames.CHANNEL, async ({ channel }, channelId) => {
  if (!channelId) {
    channel.send('Please provide channel ID.');
    return;
  }

  // TODO
  // const isFlagged = await client.antiSpam.isFlagged(channelId);
  // const ttl = await client.antiSpam.ttl(channelId);
  // const count = await client.antiSpam.getCount(channelId);
  // const targetChannel = await getChannel(channelId);

  // if (!targetChannel || !isFlagged || !ttl || !count) {
  //   channel.send('Channel is not flagged.');
  //   return;
  // }

  // channel.send(
  //   `Channel ${channelToString(targetChannel, true)} is flagged. Count: ${count + 10}. Expires in ${Math.floor(
  //     secToMin(ttl)
  //   )} min.`
  // );
});
