import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event('shardError', async (error: Error, id: number) => {
  logger.error(`[Shard #${id}] ${error.stack}`);
});
