import { stringLocale } from '#config';

const getUsageMB = (): number => process.memoryUsage().rss / 1024 ** 2;

export const getMemoryUsage = () => {
  return getUsageMB().toLocaleString(stringLocale, { maximumFractionDigits: 2 });
};
