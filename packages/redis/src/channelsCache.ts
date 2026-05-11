import type { ChannelFilter } from '@ap/database';
import { FilterMatchMode } from '@ap/validations';
import type { Snowflake } from 'discord-api-types/globals';
import type { RedisClient } from './client.js';
import type { Keys } from './constants.js';

const SCAN_COUNT = 100;

const scanKeys = async (client: RedisClient, pattern: string): Promise<string[]> => {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [next, batch] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', SCAN_COUNT);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys;
};

export const createChannelsCache = (client: RedisClient, channelKey: Keys) => {
  const _createKey = (channelId: Snowflake) => `${channelKey}:${channelId}`;

  const isEnabled = async (channelId: Snowflake): Promise<boolean> => {
    return (await client.exists(_createKey(channelId))) === 1;
  };

  const set = async (
    channelId: Snowflake,
    filters: ChannelFilter[] = [],
    filterMode: FilterMatchMode = FilterMatchMode.Any
  ) => {
    const value = JSON.stringify({ filters, filterMode });
    return await client.set(_createKey(channelId), value);
  };

  const setMany = async (
    channels: { channelId: Snowflake; filters: ChannelFilter[]; filterMode: string }[]
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
    if (channelIds.length === 0) return 0;
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
    filterMode: FilterMatchMode = FilterMatchMode.Any
  ) => {
    const value = JSON.stringify({ filters, filterMode });
    return await client.set(_createKey(channelId), value);
  };

  const getAll = async (): Promise<Snowflake[]> => {
    const keys = await scanKeys(client, `${channelKey}:*`);
    return keys.map(key => key.replace(`${channelKey}:`, '') as Snowflake);
  };

  const getSize = async () => {
    const keys = await scanKeys(client, `${channelKey}:*`);
    return keys.length;
  };

  return { isEnabled, set, setMany, remove, removeMany, get, getAll, getSize, updateFilters };
};
