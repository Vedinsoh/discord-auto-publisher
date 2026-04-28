import crypto from 'node:crypto';
import { logger } from '../logger.js';
import { Client } from './client.js';

const DATABASE_ID = 1;
const TTL_SEC = 10 * 60;

const redis = new Client(DATABASE_ID);
await redis.connect();
const client = redis.client;

const createKey = (statusCode: number) => `${crypto.randomUUID()}:${statusCode}`;

const add = async (statusCode: number) => {
  try {
    await client.setEx(createKey(statusCode), TTL_SEC, '1');
  } catch (error) {
    logger.warn({ event: 'redis.write_failed', op: 'rateLimitsCache.add', statusCode, err: error });
  }
};

const getSize = async () => {
  try {
    return await client.dbSize();
  } catch {
    return 0;
  }
};

export const RateLimitsCache = {
  add,
  getSize,
};
