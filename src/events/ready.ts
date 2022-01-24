import client from '#client';
import { Event } from '#structures/Event';
import Spam from '#modules/SpamManager';
import logger from '#util/logger';
import { memoryThresholdCheck } from '#util/memory';

export default new Event('ready', () => {

  // Set the presence and start the update interval
  /*
  client.updatePresence();
  setInterval(() => client.updatePresence(), intervals.presence * 60 * 1000);
  */

  // Check for blacklisted guilds and leave them
  Spam.startupCheck();

  // Start the hourly spam cache audit & memory check interval
  setInterval(() => {
    Spam.cacheAudit();
    memoryThresholdCheck(client.guilds.cache.size); // TODO
  }, 1000 * 60 * 60);

  logger.info(`Startup time: ${((Date.now() - client.startedAt) / 1000).toFixed(2)}s`); // TODO
});
