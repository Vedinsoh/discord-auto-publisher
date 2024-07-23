import { Data } from '@/data';

/**
 * Add request to rate limits cache
 * @param statusCode Status code of the request
 */
const add = async (statusCode: number) => {
  return Data.Repo.RateLimitsCache.add(statusCode);
};

/**
 * Get size of the rate limits cache
 * @returns Size of the cache
 */
const getSize = async () => {
  return Data.Repo.RateLimitsCache.getSize();
};

export const RateLimitsCache = {
  add,
  getSize,
};
