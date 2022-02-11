import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event('shardReady', async (id: number) => {
  logger.info(`[Shard #${id}] Ready!`);
});
