import type { Snowflake } from 'discord-api-types/globals';
import type { RedisClientType } from 'redis';
import type { Keys } from './constants.js';

export const createChannelsCache = (client: RedisClientType, channelKey: Keys) => {
  const _createKey = (channelId: Snowflake) => `${channelKey}:${channelId}`;

  const set = async (channelId: Snowflake) => {
    return await client.set(_createKey(channelId), '1');
  };

  const setMany = async (channelIds: Snowflake[]) => {
    if (channelIds.length === 0) return;
    const channelIdKeys = channelIds.flatMap(id => [_createKey(id), '1']);
    return await client.mSet(channelIdKeys);
  };

  const remove = async (channelId: Snowflake) => {
    return await client.del(_createKey(channelId));
  };

  const removeMany = async (channelIds: Snowflake[]) => {
    return await client.del(channelIds.map(id => _createKey(id)));
  };

  const get = async (channelId: Snowflake) => {
    const exists = await client.exists(_createKey(channelId));
    return exists === 1 ? channelId : null;
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

  return { set, setMany, remove, removeMany, get, getAll, getSize };
};
