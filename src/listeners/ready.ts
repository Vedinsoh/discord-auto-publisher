import client from '#client';
import { Event } from '#structures/Event';
import logger from '#util/logger';
import { memoryThresholdCheck } from '#util/memory';
import { minToMs, hourToMs, msToSec } from '#util/timeConverters';

export default new Event('ready', () => {
  // TODO Set the presence and start the update interval
  /*
  client.updatePresence();
  setInterval(() => client.updatePresence(), minToMs(intervals.presence));
  */

  // TODO Check for blacklisted guilds and leave them
  // Spam.startupCheck();
  client.cluster.blacklist.startupCheck();

  // Start the hourly memory check interval
  // TODO
  /*
  setInterval(() => {
    memoryThresholdCheck(client.guilds.cache.size); // TODO
  }, hourToMs(1));
  */

  logger.info(`Startup time: ${msToSec(Date.now() - client.startedAt).toFixed(2)}s`);
});
