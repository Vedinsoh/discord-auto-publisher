import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';

export default new Event(Events.ShardError, async (error, id) => {
  client.logger.error(`[Shard #${id}] ${error.stack}`);
});
