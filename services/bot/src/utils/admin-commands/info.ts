import { Services } from '#services';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.INFO, async ({ channel }) => {
  const data = await Services.Info.get();
  const guildsCount = await Services.Presence.getGuildsCount();
  const parsedData = [
    `Guilds: ${guildsCount}`,
    '### Messages queue:',
    `> Size: ${data?.size}`,
    `> Pending: ${data?.pending}`,
    `> Paused: ${data?.paused}`,
    '### Channel queues:',
    `> Size: ${data?.channelQueues}`,
    '### Rate limits cache:',
    `> Size: ${data?.rateLimitsSize}`,
  ];
  channel.send(parsedData.join('\n'));
});
