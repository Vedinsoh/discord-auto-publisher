import { Services } from '#services';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.INFO, async ({ channel }) => {
  const data = await Services.Info.get();
  const guildsCount = await Services.Presence.getGuildsCount();
  const parsedData = [
    `Guilds: ${guildsCount}`,
    '### REST:',
    `> Global remaining: ${data?.rest.globalRemaining}/50`,
    `> Active handlers: ${data?.rest.activeHandlers}`,
    `> Total handlers: ${data?.rest.handlers}`,
    `> Bucket hashes: ${data?.rest.hashes}`,
    '### Queue:',
    `> Waiting: ${data?.queue.waiting ?? 0}`,
    `> Active: ${data?.queue.active ?? 0}`,
    `> Delayed: ${data?.queue.delayed ?? 0}`,
    `> Failed: ${data?.queue.failed ?? 0}`,
    `> Completed: ${data?.queue.completed ?? 0}`,
    '### Channels:',
    `> Sublimit-tracked: ${data?.channelsCount}`,
    `> Cant-post cached: ${data?.cantPostCount}`,
    '### CF budget (10min window):',
    `> Invalid requests: ${data?.rest.cfBudget.count ?? 0}`,
    `> Window remaining: ${Math.round((data?.rest.cfBudget.expiresInMs ?? 0) / 1_000)}s`,
  ];
  channel.send(parsedData.join('\n'));
});
