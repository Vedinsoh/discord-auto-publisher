import crypto from 'node:crypto';

import { Constants } from '@/constants';
import { minToSec } from '@/utils/timeConversions';

import { Drivers } from '../drivers';

const { DatabaseIDs } = Constants.Data.Redis;

// Initialize Redis and connect to database
const redis = new Drivers.Redis.Client(DatabaseIDs.RequestLimitsCache);
await redis.connect();

// Initialize Redis client
const client = redis.client;

/**
 * Create a key for the rate limits cache
 * @param statusCode Status code of the request
 * @returns Key for the cache
 */
const _createKey = (statusCode: number) => `${crypto.randomUUID()}:${statusCode}`;

/**
 * Add request to rate limits cache
 * @param statusCode Status code of the request
 * @returns Redis response
 */
const set = async (statusCode: number) => {
  return await client.setEx(_createKey(statusCode), minToSec(10), '1');
};

/**
 * Get size of the rate limits cache
 * @returns Size of the cache
 */
const getSize = async () => {
  return await client.dbSize();
};

export const RateLimitsCache = {
  set,
  getSize,
};
