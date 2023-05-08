import client from '#client';
import AdminCommand from '#structures/AdminCommand';
import { CommandNames } from '#types/AdminCommandTypes';

export default new AdminCommand(CommandNames.QUEUE, async ({ channel }) => {
  const data = client.crosspostQueue.getQueueData();
  channel.send(`Size: ${data.size}\nPending: ${data.pending}\nChannel queues: ${data.channelQueues}`);
});
