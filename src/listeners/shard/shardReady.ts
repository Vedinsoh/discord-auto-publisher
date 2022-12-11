import { Events } from 'discord.js';
import client from '#client';
import Event from '#structures/Event';
import logger from '#util/logger';
import { msToSec } from '#util/timeConverters';

export default new Event(Events.ShardReady, async (id) => {
  const logPrefix = `[SHARD ${id}]`;
  const logInfo = (message: string) => logger.info(`${logPrefix} ${message}`);

  logInfo(`Ready! Startup time: ${msToSec(Date.now() - client.startedAt).toFixed(2)}s`);
});
