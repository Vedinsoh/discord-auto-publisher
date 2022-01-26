import logger from '#util/logger';
import shutdown from '#util/shutdown';
import { log } from '#config';

const getUsageMB = (): number => process.memoryUsage().rss / 1024 ** 2;

export const memoryThresholdCheck = (guilds: number) => {
  if (guilds >= 250 && getUsageMB() * 1.2 >= guilds) {
    logger.info('Memory threshold reached, restarting.');
    shutdown();
  }
};

export const getMemoryUsage = () => {
  return getUsageMB().toLocaleString(log.locale, { maximumFractionDigits: 2 });
};
