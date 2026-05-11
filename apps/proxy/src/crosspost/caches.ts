import { Keys, type RedisClient } from '@ap/redis';
import { logger } from '../logger.js';

const REDIS_TIMEOUT_MS = 500;
const SUBLIMIT_DEFAULT_TTL_SEC = 60 * 60;
const SUBLIMIT_COUNT = 10;
const BLOCKED_TTL_SEC = 60 * 60;

const withTimeout = async <T>(
  promise: Promise<T>,
  fallback: T,
  context: { op: string; channelId?: string }
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('redis_timeout')), REDIS_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    logger.warn(
      { event: 'redis.timeout', ...context, err: error },
      'Redis op timed out, failing open'
    );
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export type SublimitCounter = {
  isOverLimit(channelId: string): Promise<boolean>;
  increment(channelId: string): Promise<void>;
  lock(channelId: string, retryAfterSec: number): Promise<void>;
  size(): Promise<number>;
};

export const createSublimitCounter = (redis: RedisClient): SublimitCounter => {
  const key = (channelId: string) => `${Keys.Sublimit}:${channelId}`;

  const getCount = async (channelId: string): Promise<number> => {
    const value = await withTimeout(redis.get(key(channelId)), null, {
      op: 'sublimit.get',
      channelId,
    });
    return value ? Number(value) : 0;
  };

  return {
    isOverLimit: async channelId => (await getCount(channelId)) >= SUBLIMIT_COUNT,
    increment: async channelId => {
      try {
        await redis
          .multi()
          .incr(key(channelId))
          .expire(key(channelId), SUBLIMIT_DEFAULT_TTL_SEC, 'NX')
          .exec();
      } catch (error) {
        logger.warn({
          event: 'redis.write_failed',
          op: 'sublimit.increment',
          channelId,
          err: error,
        });
      }
    },
    lock: async (channelId, retryAfterSec) => {
      const ttl = Math.max(1, Math.ceil(retryAfterSec));
      try {
        await redis.set(key(channelId), String(SUBLIMIT_COUNT), 'EX', ttl);
      } catch (error) {
        logger.warn({ event: 'redis.write_failed', op: 'sublimit.lock', channelId, err: error });
      }
    },
    size: async () => {
      try {
        return await redis.dbsize();
      } catch {
        return 0;
      }
    },
  };
};

export type BlockedCache = {
  set(channelId: string): Promise<void>;
  isBlocked(channelId: string): Promise<boolean>;
  clear(channelId: string): Promise<void>;
  size(): Promise<number>;
};

export const createBlockedCache = (redis: RedisClient): BlockedCache => {
  const key = (channelId: string) => `${Keys.Blocked}:${channelId}`;

  return {
    set: async channelId => {
      try {
        await redis.set(key(channelId), '1', 'EX', BLOCKED_TTL_SEC);
      } catch (error) {
        logger.warn({ event: 'redis.write_failed', op: 'blocked.set', channelId, err: error });
      }
    },
    isBlocked: async channelId => {
      const value = await withTimeout(redis.get(key(channelId)), null, {
        op: 'blocked.get',
        channelId,
      });
      return value === '1';
    },
    clear: async channelId => {
      try {
        await redis.del(key(channelId));
      } catch (error) {
        logger.warn({ event: 'redis.write_failed', op: 'blocked.clear', channelId, err: error });
      }
    },
    size: async () => {
      try {
        return await redis.dbsize();
      } catch {
        return 0;
      }
    },
  };
};
