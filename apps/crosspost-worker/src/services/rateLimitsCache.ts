import { RateLimitsCache as Cache } from 'services/caches.js';

const add = (code: number) => {
  return Cache.incr(`rate_limit:${code}`);
};

const getSize = async () => {
  const keys = await Cache.keys('rate_limit:*');
  return keys.length;
};

export const RateLimitsCache = { add, getSize };
