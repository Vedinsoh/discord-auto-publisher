import { Services } from '#services';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.INFO, async ({ channel }) => {
  const data = await Services.Info.get();
  const guildsCount = await Services.Presence.getGuildsCount();
  const parsedData = [
    `Guilds: ${guildsCount}`,
    '### REST:',
    `> Global remaining: ${data?.rest.globalRemaining}/45`,
    `> Active handlers: ${data?.rest.activeHandlers}`,
    `> Total handlers: ${data?.rest.handlers}`,
    `> Bucket hashes: ${data?.rest.hashes}`,
    '### Channels:',
    `> Tracked: ${data?.channelsCount}`,
    '### Rate limits cache:',
    `> Size: ${data?.rateLimitsSize}`,
  ];
  channel.send(parsedData.join('\n'));
});
