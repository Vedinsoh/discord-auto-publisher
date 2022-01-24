import { Event } from '#structures/Event';
import logger from '#util/logger';

export default new Event('shardError', async (error: Error, shardId: number) => {
  logger.error(`Shard (ID: ${shardId}) error:\n${JSON.stringify(error, null, 4)}`);
});
