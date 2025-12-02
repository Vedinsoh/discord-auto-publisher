import type { Prisma } from '@ap/database';
import type { Snowflake } from 'discord-api-types/globals';
import type { RedisClientType } from 'redis';
import type { Keys } from './constants.js';

export const createChannelsCache = (client: RedisClientType, channelKey: Keys) => {
  const _createKey = (channelId: Snowflake) => `${channelKey}:${channelId}`;

  const set = async (channelId: Snowflake, filters: Prisma.FilterCreateInput[] = []) => {
    const value = JSON.stringify({ filters });
    return await client.set(_createKey(channelId), value);
  };

  const setMany = async (channelIds: Snowflake[]) => {
    if (channelIds.length === 0) return;
    const value = JSON.stringify({ filters: [] });
    const channelIdKeys = channelIds.flatMap(id => [_createKey(id), value]);
    return await client.mSet(channelIdKeys);
  };

  const remove = async (channelId: Snowflake) => {
    return await client.del(_createKey(channelId));
  };

  const removeMany = async (channelIds: Snowflake[]) => {
    return await client.del(channelIds.map(id => _createKey(id)));
  };

  const get = async (channelId: Snowflake) => {
    const data = await client.get(_createKey(channelId));
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  const updateFilters = async (channelId: Snowflake, filters: unknown[]) => {
    const value = JSON.stringify({ filters });
    return await client.set(_createKey(channelId), value);
  };

  const getAll = async (): Promise<Snowflake[]> => {
    const keyPattern = `${channelKey}:*`;
    const keys: string[] = [];
    let cursor = 0;

    do {
      const result = await client.scan(cursor, {
        MATCH: keyPattern,
        COUNT: 100,
      });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    return keys.map(key => key.replace(`${channelKey}:`, '') as Snowflake);
  };

  const getSize = async () => {
    const keyPattern = `${channelKey}:*`;
    const keys: string[] = [];
    let cursor = 0;

    do {
      const result = await client.scan(cursor, {
        MATCH: keyPattern,
        COUNT: 100,
      });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== 0);

    return keys.length;
  };

  return { set, setMany, remove, removeMany, get, getAll, getSize, updateFilters };
};
