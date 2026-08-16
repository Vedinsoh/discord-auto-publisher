import { env } from '../config.js';
import { logger } from '../logger.js';
import type { RedisClient } from '../redis/index.js';

const SUBLIMIT_KEY_PREFIX = 'channel:sublimit';
const SUBLIMIT_DEFAULT_TTL_SEC = 60 * 60;
const SUBLIMIT_COUNT = 10;

const BLOCKED_KEY_PREFIX = 'channel:blocked';
const BLOCKED_TTL_SEC = 60 * 60;

const BOOST_KEY_PREFIX = 'boost';
const BOOST_PUBLISHES = 10;
const BOOST_TTL_SEC = 90 * 24 * 60 * 60;

const withTimeout = async <T>(
  promise: Promise<T>,
  fallback: T,
  context: { op: string; channelId?: string; guildId?: string },
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('redis_timeout')), env.REDIS_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    // Each caller picks its own fallback direction: the gate caches fail open,
    // the boost budget fails closed (a blip must never promote the whole base).
    logger.warn({ event: 'redis.timeout', ...context, err: error }, 'Redis op timed out, using fallback');
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
  const key = (channelId: string) => `${SUBLIMIT_KEY_PREFIX}:${channelId}`;

  const getCount = async (channelId: string): Promise<number> => {
    const value = await withTimeout(redis.get(key(channelId)), null, { op: 'sublimit.get', channelId });
    return value ? Number(value) : 0;
  };

  return {
    isOverLimit: async (channelId) => (await getCount(channelId)) >= SUBLIMIT_COUNT,
    increment: async (channelId) => {
      try {
        const multi = redis.multi();
        multi.incr(key(channelId));
        multi.expire(key(channelId), SUBLIMIT_DEFAULT_TTL_SEC, 'NX');
        await multi.exec();
      } catch (error) {
        logger.warn({ event: 'redis.write_failed', op: 'sublimit.increment', channelId, err: error });
      }
    },
    lock: async (channelId, retryAfterSec) => {
      const ttl = Math.max(1, Math.ceil(retryAfterSec));
      try {
        await redis.setEx(key(channelId), ttl, String(SUBLIMIT_COUNT));
      } catch (error) {
        logger.warn({ event: 'redis.write_failed', op: 'sublimit.lock', channelId, err: error });
      }
    },
    size: async () => {
      try {
        return await redis.dbSize();
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
  const key = (channelId: string) => `${BLOCKED_KEY_PREFIX}:${channelId}`;

  return {
    set: async (channelId) => {
      try {
        await redis.setEx(key(channelId), BLOCKED_TTL_SEC, '1');
      } catch (error) {
        logger.warn({ event: 'redis.write_failed', op: 'blocked.set', channelId, err: error });
      }
    },
    isBlocked: async (channelId) => {
      const value = await withTimeout(redis.get(key(channelId)), null, { op: 'blocked.get', channelId });
      return value === '1';
    },
    clear: async (channelId) => {
      try {
        await redis.del(key(channelId));
      } catch (error) {
        logger.warn({ event: 'redis.write_failed', op: 'blocked.clear', channelId, err: error });
      }
    },
    size: async () => {
      try {
        return await redis.dbSize();
      } catch {
        return 0;
      }
    },
  };
};

/**
 * Remaining priority publishes for a newly-joined guild. The bot seeds the key from
 * `guildCreate`; the queue reads it at enqueue to pick a tier and decrements it on a
 * boosted publish. Key presence IS the boost state, so exhaustion deletes rather than
 * leaving a zero behind. See ADR 0004.
 */
export type BoostBudget = {
  seed(guildId: string): Promise<void>;
  isBoosted(guildId: string): Promise<boolean>;
  consume(guildId: string): Promise<void>;
  size(): Promise<number>;
};

export const createBoostBudget = (redis: RedisClient): BoostBudget => {
  const key = (guildId: string) => `${BOOST_KEY_PREFIX}:${guildId}`;

  return {
    // Plain SET, not NX: a genuine re-invite is a real join and re-arms the budget,
    // bounded at 10 publishes. Replayed GUILD_CREATEs never reach here — discord.js
    // only emits `guildCreate` on a cache miss while the manager is Ready, and READY
    // repopulates the guild cache before any replay arrives (ADR 0004).
    seed: async (guildId) => {
      try {
        await redis.setEx(key(guildId), BOOST_TTL_SEC, String(BOOST_PUBLISHES));
      } catch (error) {
        logger.warn({ event: 'redis.write_failed', op: 'boost.seed', guildId, err: error });
      }
    },
    // Fails CLOSED, unlike the gate caches above: a Redis blip that fell open would
    // promote every guild in the system to the boosted tier at once, which is the one
    // failure mode that makes the tier meaningless.
    isBoosted: async (guildId) => {
      const value = await withTimeout(redis.get(key(guildId)), null, { op: 'boost.get', guildId });
      return value !== null && Number(value) > 0;
    },
    consume: async (guildId) => {
      try {
        // DECR leaves the seed TTL untouched, so the 90-day safety window runs from
        // the join and does not slide with usage.
        const remaining = await redis.decr(key(guildId));
        if (remaining <= 0) await redis.del(key(guildId));
      } catch (error) {
        logger.warn({ event: 'redis.write_failed', op: 'boost.consume', guildId, err: error });
      }
    },
    size: async () => {
      try {
        return await redis.dbSize();
      } catch {
        return 0;
      }
    },
  };
};
