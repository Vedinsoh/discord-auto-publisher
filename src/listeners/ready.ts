import client from '#client';
import { Event } from '#structures/Event';
import Blacklist from '#modules/BlacklistManager';
import { msToSec } from '#util/timeConverters';
import logger from '#util/logger';

export default new Event('ready', () => {
  Blacklist.startupCheck();

  logger.info(`Startup time: ${msToSec(Date.now() - client.startedAt).toFixed(2)}s`);
});
