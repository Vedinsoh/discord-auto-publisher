import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config.js';

export type CrosspostJobData = {
  channelId: string;
  messageId: string;
};

const QUEUE_NAME = 'crosspost';
const QUEUE_DB = 3;

export const queueConnection = new IORedis(env.REDIS_URI, {
  db: QUEUE_DB,
  maxRetriesPerRequest: null,
});

export const crosspostQueue = new Queue<CrosspostJobData>(QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 10,
    backoff: { type: 'exponential', delay: 2_000 },
    removeOnComplete: { count: 1_000, age: 60 * 60 },
    removeOnFail: { count: 5_000, age: 24 * 60 * 60 },
  },
});

export const QUEUE_NAME_EXPORT = QUEUE_NAME;
