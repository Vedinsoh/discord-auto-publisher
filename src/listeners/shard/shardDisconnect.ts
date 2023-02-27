import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';

export default new Event(Events.ShardDisconnect, async (event, id) => {
  client.logger.warn(`[Shard #${id}] Code ${event.code}, ${event.reason}`);
});
