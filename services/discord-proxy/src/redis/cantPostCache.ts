import { logger } from '../logger.js';
import { Client } from './client.js';

const DATABASE_ID = 2;
const KEY_PREFIX = 'cant_post';
const TTL_SEC = 60 * 60; // 1 hour

const redis = new Client(DATABASE_ID);
await redis.connect();
const client = redis.client;

const createKey = (channelId: string) => `${KEY_PREFIX}:${channelId}`;

const set = async (channelId: string) => {
  try {
    await client.setEx(createKey(channelId), TTL_SEC, '1');
  } catch (error) {
    logger.warn({ event: 'redis.write_failed', op: 'cantPost.set', channelId, err: error });
  }
};

const isCantPost = async (channelId: string): Promise<boolean> => {
  try {
    const value = await client.get(createKey(channelId));
    return value === '1';
  } catch {
    return false;
  }
};

const clear = async (channelId: string) => {
  try {
    await client.del(createKey(channelId));
  } catch (error) {
    logger.warn({ event: 'redis.write_failed', op: 'cantPost.clear', channelId, err: error });
  }
};

const getSize = async () => {
  try {
    return await client.dbSize();
  } catch {
    return 0;
  }
};

export const CantPostCache = { set, isCantPost, clear, getSize };
