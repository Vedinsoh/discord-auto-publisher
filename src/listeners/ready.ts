import client from '#client';
import { Event } from '#structures/Event';
import Blacklist from '#modules/BlacklistManager';
import logger from '#util/logger';
import { minToMs, msToSec, secToMs } from '#util/timeConverters';
import { presenceInterval } from '#config';

export default new Event('ready', () => {
  // Set presence and start the update interval
  setTimeout(() => client.updatePresence(), secToMs(60));
  setInterval(() => client.updatePresence(), minToMs(presenceInterval));

  Blacklist.startupCheck();

  logger.info(`Startup time: ${msToSec(Date.now() - client.startedAt).toFixed(2)}s`);
});
