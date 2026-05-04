import { logger } from '../logger.js';
import { Client } from './client.js';

const DATABASE_ID = 1;
const KEY = 'invalid_requests';
const TTL_SEC = 10 * 60;
const SHED_THRESHOLD = 5_000;

const redis = new Client(DATABASE_ID);
await redis.connect();
const client = redis.client;

const increment = async (statusCode: number) => {
  try {
    const count = await client.incr(KEY);
    if (count === 1) await client.expire(KEY, TTL_SEC);
    logger.info({ event: 'cloudflare.invalid', status: statusCode, count });
  } catch (error) {
    logger.warn({ event: 'redis.write_failed', op: 'invalidRequests.increment', err: error });
  }
};

const isOverThreshold = async (): Promise<boolean> => {
  try {
    const value = await client.get(KEY);
    return value ? Number(value) >= SHED_THRESHOLD : false;
  } catch {
    return false;
  }
};

const getCount = async (): Promise<number> => {
  try {
    const value = await client.get(KEY);
    return value ? Number(value) : 0;
  } catch {
    return 0;
  }
};

export const InvalidRequestsCounter = { increment, isOverThreshold, getCount };
