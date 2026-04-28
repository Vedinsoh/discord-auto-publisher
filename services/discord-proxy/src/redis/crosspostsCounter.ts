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

const set = async (channelId: string, options?: { count?: number; expiry?: number }) => {
  const count = options?.count ?? 1;
  const ttl = options?.expiry ?? DEFAULT_TTL_SEC;
  try {
    await client.setEx(createKey(channelId), ttl, String(count));
  } catch (error) {
    logger.warn({ event: 'redis.write_failed', op: 'set', channelId, err: error });
  }
};

const getCount = async (channelId: string): Promise<number> => {
  const value = await withTimeout(client.get(createKey(channelId)), null, 'getCount', channelId);
  return value ? Number(value) : 0;
};

const getExpiration = async (channelId: string): Promise<number | null> => {
  const ttl = await withTimeout(client.ttl(createKey(channelId)), -2, 'getExpiration', channelId);
  return ttl === -2 ? null : ttl;
};

const isOverLimit = async (channelId: string): Promise<boolean> => {
  const count = await getCount(channelId);
  return count >= SUBLIMIT_COUNT;
};

const increment = async (channelId: string) => {
  const prevCount = await getCount(channelId);
  if (!prevCount) {
    return set(channelId);
  }
  const prevExpiry = await getExpiration(channelId);
  if (!prevExpiry) {
    return set(channelId);
  }
  return set(channelId, { count: prevCount + 1, expiry: prevExpiry });
};

const lockSublimit = async (channelId: string, retryAfterSec: number) => {
  return set(channelId, { count: SUBLIMIT_COUNT, expiry: Math.max(1, Math.ceil(retryAfterSec)) });
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
