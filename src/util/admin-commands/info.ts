import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.INFO, async ({ channel }) => {
  const data = client.crosspostQueue.getQueueData();
  const rateLimitSize = await client.cache.requestLimits.getSize();
  const guildsCount = await client.data.getGuildsCount();
  const parsedData = [
    `Guilds: ${guildsCount}`,
    '',
    `Queue size: ${data.size}`,
    `Pending in queue: ${data.pending}`,
    `Channel queues: ${data.channelQueues}`,
    `Queue paused: ${data.paused}`,
    '',
    `Rate limit size: ${rateLimitSize}`,
  ];
  channel.send(parsedData.join('\n'));
});
