import type { REST } from '@discordjs/rest';
import { DelayedError, type Job, Queue, Worker } from 'bullmq';
import { Routes, type Snowflake } from 'discord-api-types/v10';
import express, { type Router } from 'express';
import IORedis, { type Redis } from 'ioredis';
import { logger } from '../logger.js';
import type { CantPostCache, SublimitCounter } from './caches.js';
import { type CrosspostOutcome, classify } from './classifier.js';
import type { Gate } from './gate.js';

const QUEUE_NAME = 'crosspost';
const QUEUE_DB = 3;
const QUEUE_HIGH_WATER = 10_000;
const RATE_LIMIT_RETRY_CAP_MS = 5 * 60 * 1_000;
const CF_BUDGET_DELAY_MS = 60_000;
const CHANNEL_ID_PATTERN = /^\d{17,19}$/;

export type CrosspostJobData = {
  channelId: Snowflake;
  messageId: Snowflake;
};

export type CrosspostQueueStats = {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
};

export type CrosspostQueueModule = {
  router: Router;
  internalRouter: Router;
  shutdown(): Promise<void>;
  stats(): Promise<CrosspostQueueStats>;
};

export const createCrosspostQueue = (deps: {
  rest: REST;
  gate: Gate;
  caches: { cantPost: CantPostCache; sublimit: SublimitCounter };
  redisUri: string;
  concurrency: number;
}): CrosspostQueueModule => {
  const connection: Redis = new IORedis(deps.redisUri, { db: QUEUE_DB, maxRetriesPerRequest: null });

  const queue = new Queue<CrosspostJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 10,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: { count: 1_000, age: 60 * 60 },
      removeOnFail: { count: 5_000, age: 24 * 60 * 60 },
    },
  });

  const reactToOutcome = async (outcome: CrosspostOutcome, job: Job<CrosspostJobData>): Promise<void> => {
    const { channelId, messageId } = job.data;
    switch (outcome.kind) {
      case 'already_done':
        await deps.caches.sublimit.increment(channelId);
        logger.debug({ event: 'crosspost.already', channelId, messageId });
        return;
      case 'cant_post':
        await deps.caches.cantPost.set(channelId);
        logger.info({ event: 'crosspost.cant_post', channelId, messageId, status: outcome.status });
        return;
      case 'sublimit':
        await deps.caches.sublimit.lock(channelId, outcome.retryAfterMs / 1_000);
        logger.info({ event: 'crosspost.sublimit', channelId, messageId, retryAfterMs: outcome.retryAfterMs });
        return;
      case 'global_ratelimit':
      case 'transient_429': {
        const delayMs = Math.min(outcome.retryAfterMs, RATE_LIMIT_RETRY_CAP_MS);
        logger.warn({ event: 'crosspost.rate_limited', channelId, messageId, kind: outcome.kind, delayMs });
        await job.moveToDelayed(Date.now() + delayMs, job.token);
        throw new DelayedError();
      }
      case 'fatal_4xx':
        logger.warn({ event: 'crosspost.discord_error', channelId, messageId, status: outcome.status, code: outcome.code });
        return;
      case 'retryable_5xx':
        logger.warn({ event: 'crosspost.retryable', channelId, messageId, status: outcome.status });
        throw new Error(`crosspost_retryable_${outcome.status}`);
    }
  };

  const processJob = async (job: Job<CrosspostJobData>): Promise<void> => {
    const { channelId, messageId } = job.data;
    const verdict = await deps.gate.evaluate(channelId);
    if (verdict.kind === 'reject') {
      if (verdict.reason === 'cf_budget') {
        logger.warn({ event: 'crosspost.shed.cf_budget', channelId, messageId });
        await job.moveToDelayed(Date.now() + CF_BUDGET_DELAY_MS, job.token);
        throw new DelayedError();
      }
      logger.debug({ event: 'crosspost.skipped', channelId, messageId, reason: verdict.reason });
      return;
    }

    try {
      await deps.rest.post(Routes.channelMessageCrosspost(channelId, messageId));
      await deps.caches.sublimit.increment(channelId);
      logger.debug({ event: 'crosspost.success', channelId, messageId });
    } catch (error) {
      const outcome = classify(error);
      await reactToOutcome(outcome, job);
    }
  };

  const worker = new Worker<CrosspostJobData>(QUEUE_NAME, processJob, { connection, concurrency: deps.concurrency });

  worker.on('failed', (job, err) => {
    if (err instanceof DelayedError) return;
    logger.warn({ event: 'crosspost.job_failed', jobId: job?.id, attemptsMade: job?.attemptsMade, err });
  });
  worker.on('error', (err) => logger.error({ event: 'worker.error', err }));

  const router = express.Router();
  router.post('/crosspost/:channelId/:messageId', async (req, res) => {
    const { channelId, messageId } = req.params;
    if (!CHANNEL_ID_PATTERN.test(channelId) || !CHANNEL_ID_PATTERN.test(messageId)) {
      res.status(400).end();
      return;
    }

    const verdict = await deps.gate.evaluate(channelId);
    if (verdict.kind === 'reject') {
      if (verdict.reason === 'cf_budget') {
        logger.warn({ event: 'crosspost.rejected.cf_budget', channelId, messageId });
        res.setHeader('Retry-After', '60').status(503).end();
        return;
      }
      logger.debug({ event: 'crosspost.rejected', channelId, messageId, reason: verdict.reason });
      res.status(204).end();
      return;
    }

    const waiting = await queue.getWaitingCount();
    if (waiting >= QUEUE_HIGH_WATER) {
      logger.warn({ event: 'crosspost.rejected.queue_overloaded', channelId, messageId, waiting });
      res.setHeader('Retry-After', '30').status(503).end();
      return;
    }

    await queue.add('crosspost', { channelId, messageId }, { jobId: `${channelId}-${messageId}` });
    res.status(202).end();
  });

  const internalRouter = express.Router();
  internalRouter.delete('/internal/cant-post/:channelId', async (req, res) => {
    const { channelId } = req.params;
    if (!CHANNEL_ID_PATTERN.test(channelId)) {
      res.status(400).end();
      return;
    }
    await deps.caches.cantPost.clear(channelId);
    res.status(204).end();
  });

  return {
    router,
    internalRouter,
    shutdown: async () => {
      await worker.close();
      await queue.close();
      await connection.quit();
    },
    stats: async () => {
      const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed');
      return {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        delayed: counts.delayed ?? 0,
        failed: counts.failed ?? 0,
        completed: counts.completed ?? 0,
      };
    },
  };
};
