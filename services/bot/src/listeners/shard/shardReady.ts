import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';

export default new Event(Events.ShardReady, async (id) => {
  client.logger.info(`Shard ${id} ready!`);
});
