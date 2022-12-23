import { Events } from 'discord.js';
import Event from '#structures/Event';
import logger from '#util/logger';

export default new Event(Events.ShardDisconnect, async (event, id) => {
  logger.warn(`[Shard #${id}] Code ${event.code}, ${event.reason}`);
});
