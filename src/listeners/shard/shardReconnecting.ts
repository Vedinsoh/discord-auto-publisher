import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event('shardReconnecting', async (id: number) => {
  logger.warn(`[Shard #${id}] Reconnecting...`);
});
