import { Drivers } from 'data/drivers/index.js';

const client = Drivers.Redis.RateLimits;

const add = (code: number) => {
  return client.incr(`rate_limit:${code}`);
};

const getSize = async () => {
  const keys = await client.keys('rate_limit:*');
  return keys.length;
};

export const RateLimits = { add, getSize };
