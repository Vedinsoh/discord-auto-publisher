import client from '#client';
import { stringLocale } from '#config';

const getUsageMB = async (): Promise<number[]> => {
  return await client.cluster.evalOnManager('process.memoryUsage().rss / 1024 ** 2');
};

const getMemString = (usage: number) => {
  return usage.toLocaleString(stringLocale, { maximumFractionDigits: 2 });
};

export const getMemoryUsage = async () => {
  const usage = await getUsageMB();
  if (usage.length) {
    const totalUsage = usage.reduce((p, n) => p + n);
    return getMemString(totalUsage);
  }
  return getMemString(usage as unknown as number);
};
