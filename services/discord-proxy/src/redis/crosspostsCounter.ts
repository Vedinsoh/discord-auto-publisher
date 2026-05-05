import { env } from '../config.js';
import { logger } from '../logger.js';
import { Client } from './client.js';

const DATABASE_ID = 0;
const KEY_PREFIX = 'channel';
const DEFAULT_TTL_SEC = 60 * 60;
const SUBLIMIT_COUNT = 10;

const redis = new Client(DATABASE_ID);
await redis.connect();
const client = redis.client;

const createKey = (channelId: string) => `${KEY_PREFIX}:${channelId}`;

const withTimeout = async <T>(promise: Promise<T>, fallback: T, op: string, channelId: string): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('redis_timeout')), env.REDIS_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    logger.warn({ event: 'redis.timeout', op, channelId, err: error }, 'Redis op timed out, failing open');
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const getCount = async (channelId: string): Promise<number> => {
  const value = await withTimeout(client.get(createKey(channelId)), null, 'getCount', channelId);
  return value ? Number(value) : 0;
};

const isOverLimit = async (channelId: string): Promise<boolean> => {
  const count = await getCount(channelId);
  return count >= SUBLIMIT_COUNT;
};

/**
 * Atomically increment the per-channel counter. Uses pipelined INCR + EXPIRE NX
 * to avoid the previous 3-call race (GET → TTL → SETEX) and reduce Redis pressure.
 * EXPIRE NX only sets a TTL on first increment; subsequent ones keep the existing window.
 */
const increment = async (channelId: string) => {
  const key = createKey(channelId);
  try {
    const multi = client.multi();
    multi.incr(key);
    multi.expire(key, DEFAULT_TTL_SEC, 'NX');
    await multi.exec();
  } catch (error) {
    logger.warn({ event: 'redis.write_failed', op: 'increment', channelId, err: error });
  }
};

const lockSublimit = async (channelId: string, retryAfterSec: number) => {
  const key = createKey(channelId);
  const ttl = Math.max(1, Math.ceil(retryAfterSec));
  try {
    await client.setEx(key, ttl, String(SUBLIMIT_COUNT));
  } catch (error) {
    logger.warn({ event: 'redis.write_failed', op: 'lockSublimit', channelId, err: error });
  }
};

const getSize = async () => {
  try {
    return await client.dbSize();
  } catch {
    return 0;
  }
};

export const CrosspostsCounter = {
  isOverLimit,
  increment,
  lockSublimit,
  getSize,
};
