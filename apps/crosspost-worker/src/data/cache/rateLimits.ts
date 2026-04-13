import crypto from 'node:crypto';
import { minToSec } from '@ap/utils';
import { Drivers } from 'data/drivers/index.js';

const client = Drivers.Redis.RateLimits;

const add = async (code: number) => {
  const key = `${crypto.randomUUID()}:${code}`;
  return client.setEx(key, minToSec(10), '1');
};

const getSize = () => {
  return client.dbSize();
};

export const RateLimits = { add, getSize };
