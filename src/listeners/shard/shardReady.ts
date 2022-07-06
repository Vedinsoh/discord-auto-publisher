import client from '#client';
import { Event } from '#structures/Event';
import { msToSec } from '#util/timeConverters';
import logger from '#util/logger';

export default new Event('shardReady', async (id: number) => {
  const logPrefix = `[SHARD ${id}]`;
  const logInfo = (message: string) => logger.info(`${logPrefix} ${message}`);

  logInfo(`Ready! Startup time: ${msToSec(Date.now() - client.startedAt).toFixed(2)}s`);
});
