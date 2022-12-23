import { Events } from 'discord.js';
import Event from '#structures/Event';
import logger from '#util/logger';

export default new Event(Events.ShardReady, async (id) => {
  const logPrefix = `[SHARD ${id}]`;
  const logInfo = (message: string) => logger.info(`${logPrefix} ${message}`);

  logInfo('Ready!');
});
