import { Drivers } from 'data/drivers/index.js';

const client = Drivers.Redis.RateLimits;

const add = (code: number) => {
  return client.incr(`rate_limit:${code}`);
};

const getSize = async (): Promise<number> => {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const result = await client.scan(cursor, {
      MATCH: 'rate_limit:*',
      COUNT: 100,
    });
    cursor = result.cursor;
    keys.push(...result.keys);
  } while (cursor !== '0');

  if (keys.length === 0) return 0;

  const values = await client.mGet(keys);
  return values.reduce((sum, value) => sum + (value ? Number.parseInt(value, 10) : 0), 0);
};

export const RateLimits = { add, getSize };
