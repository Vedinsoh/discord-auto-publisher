import logger from '#util/logger';
import shutdown from '#util/shutdown';
import { log } from '#config';

export const memoryThresholdCheck = (guilds: number) => {
  if (guilds >= 250 && (process.memoryUsage().rss / 1024 ** 2) * 1.2 >= guilds) {
    logger.info('Memory threshold reached, restarting.');
    shutdown();
  }
};

export const getMemoryUsage = () => {
  return (process.memoryUsage().rss / 1024 ** 2).toLocaleString(log.locale, { maximumFractionDigits: 2 });
};
