import { DiscordAPIError, HTTPError, RateLimitError, type REST } from '@discordjs/rest';
import { DelayedError, Worker, type Job } from 'bullmq';
import { logger } from '../logger.js';
import { CantPostCache, CrosspostsCounter, InvalidRequestsCounter } from '../redis/index.js';
import { type CrosspostJobData, queueConnection } from './crosspostQueue.js';

const ALREADY_CROSSPOSTED_CODE = 40033;
const WORKER_CONCURRENCY = 50;
const RATE_LIMIT_RETRY_CAP_MS = 5 * 60 * 1_000; // 5 min

const processJob = async (api: REST, job: Job<CrosspostJobData>): Promise<void> => {
  const { channelId, messageId } = job.data;

  // Pre-check: CF-ban shed (system-wide protection)
  if (await InvalidRequestsCounter.isOverThreshold()) {
    logger.warn({ event: 'crosspost.shed.cf_budget', channelId, messageId });
    await job.moveToDelayed(Date.now() + 60_000, job.token);
    throw new DelayedError();
  }

  // Pre-check: known cant-post channel (negative cache)
  if (await CantPostCache.isCantPost(channelId)) {
    logger.debug({ event: 'crosspost.skipped.cant_post', channelId, messageId });
    return;
  }

  // Pre-check: channel sublimit-locked (cross-shard via Redis)
  if (await CrosspostsCounter.isOverLimit(channelId)) {
    logger.debug({ event: 'crosspost.skipped.sublimit_locked', channelId, messageId });
    return;
  }

  try {
    await api.post(`/channels/${channelId}/messages/${messageId}/crosspost`);
    void CrosspostsCounter.increment(channelId);
    logger.debug({ event: 'crosspost.success', channelId, messageId });
    return;
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Sublimit (10/hr per channel) — lock and don't retry
      if (error.scope === 'shared' && !error.global) {
        await CrosspostsCounter.lockSublimit(channelId, error.retryAfter / 1_000);
        logger.info({
          event: 'crosspost.sublimit',
          channelId,
          messageId,
          retryAfterSec: error.retryAfter / 1_000,
        });
        return;
      }
      // Pre-flight reject for sublimit-locked bucket (timeToReset > 60s)
      if (!error.global && error.retryAfter > 60_000) {
        await CrosspostsCounter.lockSublimit(channelId, error.retryAfter / 1_000);
        logger.info({
          event: 'crosspost.preflight_sublimit',
          channelId,
          messageId,
          retryAfterSec: error.retryAfter / 1_000,
        });
        return;
      }
      // Global or transient route 429 — wait and retry
      const delayMs = Math.min(error.retryAfter, RATE_LIMIT_RETRY_CAP_MS);
      if (error.scope !== 'shared') void InvalidRequestsCounter.increment(429);
      logger.warn({
        event: 'crosspost.rate_limited',
        channelId,
        messageId,
        scope: error.scope,
        global: error.global,
        delayMs,
      });
      await job.moveToDelayed(Date.now() + delayMs, job.token);
      throw new DelayedError();
    }

    if (error instanceof DiscordAPIError) {
      // Already crossposted — count it and finish
      if (error.code === ALREADY_CROSSPOSTED_CODE) {
        void CrosspostsCounter.increment(channelId);
        logger.debug({ event: 'crosspost.already', channelId, messageId });
        return;
      }
      // Permission / authentication issue — cache and don't retry
      if (error.status === 401 || error.status === 403) {
        await CantPostCache.set(channelId);
        void InvalidRequestsCounter.increment(error.status);
        logger.info({
          event: 'crosspost.cant_post',
          channelId,
          messageId,
          status: error.status,
          code: error.code,
        });
        return;
      }
      // Other 4xx (bad request, missing access, channel deleted, etc.) — don't retry.
      // Per Discord docs, only 401/403/429 count toward the CF invalid-request budget,
      // so we don't increment the counter here.
      if (error.status >= 400 && error.status < 500) {
        logger.warn({
          event: 'crosspost.discord_error',
          channelId,
          messageId,
          status: error.status,
          code: error.code,
        });
        return;
      }
      // 5xx from Discord — let BullMQ retry with exponential backoff
      throw error;
    }

    if (error instanceof HTTPError) {
      // 5xx — retry
      throw error;
    }

    // Network / timeout / unknown — retry
    throw error;
  }
};

export const startCrosspostWorker = (api: REST): Worker<CrosspostJobData> => {
  const worker = new Worker<CrosspostJobData>(
    'crosspost',
    (job) => processJob(api, job),
    {
      connection: queueConnection,
      concurrency: WORKER_CONCURRENCY,
    },
  );

  worker.on('failed', (job, err) => {
    if (err instanceof DelayedError) return;
    logger.warn({
      event: 'crosspost.job_failed',
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      err,
    });
  });

  worker.on('error', (err) => {
    logger.error({ event: 'worker.error', err });
  });

  return worker;
};
