import type { Prisma } from '@ap/database';
import type { Snowflake } from 'discord-api-types/globals';
import type { RedisClientType } from 'redis';
import type { Keys } from './constants.js';

export const createChannelsCache = (client: RedisClientType, channelKey: Keys) => {
  const _createKey = (channelId: Snowflake) => `${channelKey}:${channelId}`;

  const isEnabled = async (channelId: Snowflake): Promise<boolean> => {
    return (await client.exists(_createKey(channelId))) === 1;
  };

  const set = async (
    channelId: Snowflake,
    filters: Prisma.FilterCreateInput[] = [],
    filterMode: 'any' | 'all' = 'any'
  ) => {
    const value = JSON.stringify({ filters, filterMode });
    return await client.set(_createKey(channelId), value);
  };

  const setMany = async (
    channels: { channelId: Snowflake; filters: Prisma.FilterCreateInput[]; filterMode: string }[]
  ) => {
    if (channels.length === 0) return;
    const pipeline = client.multi();
    for (const ch of channels) {
      const value = JSON.stringify({ filters: ch.filters, filterMode: ch.filterMode });
      pipeline.set(_createKey(ch.channelId), value);
    }
    await pipeline.exec();
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

  const updateFilters = async (
    channelId: Snowflake,
    filters: unknown[],
    filterMode: 'any' | 'all' = 'any'
  ) => {
    const value = JSON.stringify({ filters, filterMode });
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

  return { isEnabled, set, setMany, remove, removeMany, get, getAll, getSize, updateFilters };
};
