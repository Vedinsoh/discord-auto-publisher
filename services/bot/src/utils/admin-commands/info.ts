import { Services } from '#services';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.INFO, async ({ channel }) => {
  const data = await Services.Info.get();
  const guildsCount = await Services.Presence.getGuildsCount();
  const parsedData = [
    `Guilds: ${guildsCount}`,
    '',
    `Queue size: ${data?.size}`,
    `Pending in queue: ${data?.pending}`,
    `Channel queues: ${data?.channelQueues}`,
    `Queue paused: ${data?.paused}`,
    '',
  ];
  channel.send(parsedData.join('\n'));
});
