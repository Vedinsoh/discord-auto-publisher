import client from '#client';
import { Event } from '#structures/Event';
import Blacklist from '#modules/BlacklistManager';
import { minToMs, msToSec, secToMs } from '#util/timeConverters';
import logger from '#util/logger';
import { presenceInterval } from '#config';

export default new Event('ready', () => {
  // Set presence and start the update interval
  setTimeout(() => client.updatePresence(), secToMs(60)); // TODO change to depend on whether all clusters are ready
  setInterval(() => client.updatePresence(), minToMs(presenceInterval));

  Blacklist.startupCheck();

  logger.info(`Startup time: ${msToSec(Date.now() - client.startedAt).toFixed(2)}s`);
});
