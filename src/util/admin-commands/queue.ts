import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.QUEUE, async ({ channel }) => {
  const data = client.crosspostQueue.getQueueData();
  const parsedData = [
    `Size: ${data.size}`,
    `Pending: ${data.pending}`,
    `Channel queues: ${data.channelQueues}`,
    `Paused: ${data.paused}`,
  ];
  channel.send(parsedData.join('\n'));
});
