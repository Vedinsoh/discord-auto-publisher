import shutdown from '#functions/shutdown';
import logger from '#util/logger';
import { stringLocale } from '#config';

const getUsageMB = (): number => process.memoryUsage().rss / 1024 ** 2;

export const memoryThresholdCheck = (guilds: number) => {
  if (guilds >= 250 && getUsageMB() * 1.2 >= guilds) {
    logger.info('Memory threshold reached, restarting.');
    shutdown();
  }
};

export const getMemoryUsage = () => {
  return getUsageMB().toLocaleString(stringLocale, { maximumFractionDigits: 2 });
};
