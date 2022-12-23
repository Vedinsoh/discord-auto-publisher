import { Events } from 'discord.js';
import Event from '#structures/Event';
import logger from '#util/logger';

export default new Event(Events.ShardError, async (error, id) => {
  logger.error(`[Shard #${id}] ${error.stack}`);
});
