import type { ServerResponse } from 'node:http';
import { logger } from '../logger.js';
import { crosspostQueue } from '../queue/crosspostQueue.js';
import { CantPostCache, CrosspostsCounter, InvalidRequestsCounter } from '../redis/index.js';

const QUEUE_HIGH_WATER = 10_000;

export const handleCrosspost = async (channelId: string, messageId: string, res: ServerResponse) => {
  // Fast pre-checks for obvious skips. These avoid enqueueing work that will be dropped anyway.
  if (await InvalidRequestsCounter.isOverThreshold()) {
    logger.warn({ event: 'crosspost.rejected.cf_budget', channelId, messageId });
    res.statusCode = 503;
    res.setHeader('Retry-After', '60');
    res.end();
    return;
  }

  if (await CantPostCache.isCantPost(channelId)) {
    logger.debug({ event: 'crosspost.rejected.cant_post', channelId, messageId });
    res.statusCode = 204;
    res.end();
    return;
  }

  if (await CrosspostsCounter.isOverLimit(channelId)) {
    logger.debug({ event: 'crosspost.rejected.sublimit_locked', channelId, messageId });
    res.statusCode = 204;
    res.end();
    return;
  }

  // Backpressure: if queue is overloaded, shed early
  const waiting = await crosspostQueue.getWaitingCount();
  if (waiting >= QUEUE_HIGH_WATER) {
    logger.warn({ event: 'crosspost.rejected.queue_overloaded', channelId, messageId, waiting });
    res.statusCode = 503;
    res.setHeader('Retry-After', '30');
    res.end();
    return;
  }

  // Enqueue with deterministic jobId for natural dedup of duplicate sends.
  // BullMQ disallows `:` in jobId, use `-` as separator.
  await crosspostQueue.add(
    'crosspost',
    { channelId, messageId },
    { jobId: `${channelId}-${messageId}` },
  );

  res.statusCode = 202;
  res.end();
};
