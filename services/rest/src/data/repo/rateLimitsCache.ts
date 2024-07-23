import crypto from 'node:crypto';

import { Constants } from '@/constants';
import { Data } from '@/data';
import { minToSec } from '@/utils/timeConversions';

const { DatabaseIDs } = Constants.Data.Redis;

// Initialize Redis and connect to database
const redis = new Data.Drivers.Redis.Client(DatabaseIDs.RequestLimitsCache);
await redis.connect();

// Initialize Redis client
const client = redis.client;

// Create key for the identifier and code
const _createKey = (statusCode: number) => `${crypto.randomUUID()}:${statusCode}`;

/**
 * Add request to rate limits cache
 * @param statusCode Status code of the request
 * @returns Redis response
 */
const add = async (statusCode: number) => {
  return await client.setEx(_createKey(statusCode), minToSec(1), '1');
};

/**
 * Get size of the rate limits cache
 * @returns Size of the cache
 */
const getSize = async () => {
  return await client.dbSize();
};

export const RateLimitsCache = {
  add,
  getSize,
};
