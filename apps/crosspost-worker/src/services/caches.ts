import { DatabaseIDs, RedisClient } from '@ap/redis';
import { minToSec } from '@ap/utils';
import type { Snowflake } from 'discord-api-types/globals';
import { Logger } from './logger.js';

// Initialize Redis clients
const channelCounterClient = new RedisClient(DatabaseIDs.ChannelsCrosspostsCount, Logger);
const rateLimitsClient = new RedisClient(DatabaseIDs.RateLimitsCache, Logger);

await channelCounterClient.connect();
await rateLimitsClient.connect();

// Channel crossposts cache implementation
const createChannelCounter = (client: typeof channelCounterClient.client) => {
  const _createKey = (channelId: Snowflake) => `channel:${channelId}`;

  const set = async (channelId: Snowflake, { count = 1, ttl = minToSec(60) }) => {
    await client.setEx(_createKey(channelId), ttl, count.toString());

    return {
      channelId,
      count,
      expiry: ttl,
    };
  };

  const getCount = async (channelId: Snowflake): Promise<number> => {
    const count = await client.get(_createKey(channelId));
    return count ? Number.parseInt(count, 10) : 0;
  };

  const getExpiration = async (channelId: Snowflake): Promise<number | null> => {
    const ttl = await client.ttl(_createKey(channelId));
    return ttl > 0 ? ttl : null;
  };

  const getSize = async (): Promise<number> => {
    const keys: string[] = [];
    let cursor = 0;
    do {
      const result = await client.scan(cursor, {
        MATCH: 'channel:*',
        COUNT: 100,
      });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);
    return keys.length;
  };

  return { set, getCount, getExpiration, getSize };
};

export const ChannelCounter = createChannelCounter(channelCounterClient.client);
export const RateLimitsCache = rateLimitsClient.client;
