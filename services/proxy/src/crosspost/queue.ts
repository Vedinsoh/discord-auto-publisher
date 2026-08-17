import type { REST } from '@discordjs/rest';
import { DelayedError, type Job, Queue, Worker } from 'bullmq';
import { Routes, type Snowflake } from 'discord-api-types/v10';
import express, { type Router } from 'express';
import IORedis, { type Redis } from 'ioredis';
import { logger } from '../logger.js';
import type { BlockedCache, BoostBudget, SublimitCounter } from './caches.js';
import { type CrosspostOutcome, classify } from './classifier.js';
import type { Gate } from './gate.js';
import type { LatencyReporter } from './latency.js';

const QUEUE_NAME = 'crosspost';
const QUEUE_DB = 0;
const QUEUE_HIGH_WATER = 10_000;
const RATE_LIMIT_RETRY_CAP_MS = 5 * 60 * 1_000;
const INVALID_REQUESTS_DELAY_MS = 60_000;
const SNOWFLAKE_PATTERN = /^\d{17,19}$/;

/**
 * Queue tiers. Lower is higher priority; BullMQ's valid range is 1..2_097_152.
 *
 * INVARIANT: every `queue.add` MUST pass an explicit priority. BullMQ serves
 * un-prioritized jobs BEFORE prioritized ones — `fetchNextJob.lua` RPOPLPUSHes from
 * the `wait` list and only falls back to the prioritized sorted set when `wait` is
 * empty. So leaving any job untagged (priority 0 = "no priority") would starve the
 * boosted tier behind a backlog that at peak never drains, making the boost strictly
 * worse than plain FIFO. See ADR 0004.
 */
const PRIORITY = { BOOSTED: 1, NORMAL: 10 } as const;

export type CrosspostJobData = {
  guildId: Snowflake;
  channelId: Snowflake;
  messageId: Snowflake;
};

export type CrosspostQueueStats = {
  /**
   * Untagged depth. MUST stay 0 — a non-zero value means some `queue.add` lost its
   * explicit priority and is starving the boosted tier (see PRIORITY).
   */
  waiting: number;
  /** Where all depth lives now that every job carries a priority */
  prioritized: number;
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
  caches: { blocked: BlockedCache; sublimit: SublimitCounter };
  boostBudget: BoostBudget;
  latency: LatencyReporter;
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

  const isBoosted = (job: Job<CrosspostJobData>) => job.opts.priority === PRIORITY.BOOSTED;

  // Gated on the job's OWN priority, not on a fresh budget read: an unconditional
  // DECR would mint a negative key for every guild in the system.
  const consumeBoost = async (job: Job<CrosspostJobData>): Promise<void> => {
    if (isBoosted(job)) await deps.boostBudget.consume(job.data.guildId);
  };

  const reactToOutcome = async (outcome: CrosspostOutcome, job: Job<CrosspostJobData>): Promise<void> => {
    const { channelId, messageId } = job.data;
    switch (outcome.kind) {
      case 'already_done':
        await deps.caches.sublimit.increment(channelId);
        // The crosspost exists, so the guild got the benefit and it must cost a publish.
        // Free `already_done`s would leave the budget full for the whole 90-day TTL.
        await consumeBoost(job);
        logger.debug({ event: 'crosspost.already', channelId, messageId });
        return;
      case 'blocked':
        await deps.caches.blocked.set(channelId);
        logger.info({ event: 'crosspost.blocked', channelId, messageId, status: outcome.status });
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
      if (verdict.reason === 'invalid_requests') {
        logger.warn({ event: 'crosspost.shed.invalid_requests', channelId, messageId });
        await job.moveToDelayed(Date.now() + INVALID_REQUESTS_DELAY_MS, job.token);
        throw new DelayedError();
      }
      logger.debug({ event: 'crosspost.skipped', channelId, messageId, reason: verdict.reason });
      return;
    }

    try {
      await deps.rest.post(Routes.channelMessageCrosspost(channelId, messageId));
      await deps.caches.sublimit.increment(channelId);
      await consumeBoost(job);
      // `attemptsStarted` is bumped by `prepareJobForProcessing.lua` on every pickup,
      // so > 1 means this job bounced (rate limit or 5xx) rather than merely queued.
      deps.latency.record(isBoosted(job) ? 'boosted' : 'normal', Date.now() - job.timestamp, job.attemptsStarted > 1);
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
  router.post('/crosspost/:guildId/:channelId/:messageId', async (req, res) => {
    const { guildId, channelId, messageId } = req.params;
    if (
      !SNOWFLAKE_PATTERN.test(guildId) ||
      !SNOWFLAKE_PATTERN.test(channelId) ||
      !SNOWFLAKE_PATTERN.test(messageId)
    ) {
      res.status(400).end();
      return;
    }

    const verdict = await deps.gate.evaluate(channelId);
    if (verdict.kind === 'reject') {
      if (verdict.reason === 'invalid_requests') {
        logger.warn({ event: 'crosspost.rejected.invalid_requests', channelId, messageId });
        res.setHeader('Retry-After', '60').status(503).end();
        return;
      }
      logger.debug({ event: 'crosspost.rejected', channelId, messageId, reason: verdict.reason });
      res.status(204).end();
      return;
    }

    // Both states, never `getWaitingCount()`: BullMQ's 'waiting' expands to `wait` +
    // `paused` (`sanitizeJobTypes`) and never covers `prioritized`, so once every job
    // carries a priority a waiting-only read is permanently 0 and this shed can never
    // fire — removing the only bound on queue growth. One round trip either way.
    const counts = await queue.getJobCounts('waiting', 'prioritized');
    const waiting = counts.waiting ?? 0;
    const prioritized = counts.prioritized ?? 0;
    const depth = waiting + prioritized;
    if (depth >= QUEUE_HIGH_WATER) {
      logger.warn({ event: 'crosspost.rejected.queue_overloaded', channelId, messageId, waiting, prioritized });
      res.setHeader('Retry-After', '30').status(503).end();
      return;
    }

    const priority = (await deps.boostBudget.isBoosted(guildId)) ? PRIORITY.BOOSTED : PRIORITY.NORMAL;

    await queue.add('crosspost', { guildId, channelId, messageId }, { jobId: `${channelId}-${messageId}`, priority });

    // Boosted enqueues log at `info` so the feature is measurable in prod (bounded: 10
    // per new guild). The normal tier stays at `debug` — an info line per message would
    // be thousands an hour at peak.
    if (priority === PRIORITY.BOOSTED) {
      logger.info({ event: 'crosspost.enqueued.boosted', guildId, channelId, messageId, priority });
    } else {
      logger.debug({ event: 'crosspost.enqueued', guildId, channelId, messageId, priority });
    }

    res.status(202).end();
  });

  const internalRouter = express.Router();
  internalRouter.delete('/internal/blocked/:channelId', async (req, res) => {
    const { channelId } = req.params;
    if (!SNOWFLAKE_PATTERN.test(channelId)) {
      res.status(400).end();
      return;
    }
    await deps.caches.blocked.clear(channelId);
    res.status(204).end();
  });

  internalRouter.post('/internal/boost/:guildId', async (req, res) => {
    const { guildId } = req.params;
    if (!SNOWFLAKE_PATTERN.test(guildId)) {
      res.status(400).end();
      return;
    }
    await deps.boostBudget.seed(guildId);
    logger.info({ event: 'boost.seeded', guildId });
    res.status(204).end();
  });

  return {
    router,
    internalRouter,
    shutdown: async () => {
      await worker.close();
      await queue.close();
      await connection.quit();
      deps.latency.stop();
    },
    stats: async () => {
      // `waiting` and `prioritized` stay SEPARATE here (unlike the shed above) so the
      // PRIORITY invariant is a watchable number in prod: waiting != 0 means some
      // `queue.add` lost its explicit priority.
      const counts = await queue.getJobCounts('waiting', 'prioritized', 'active', 'delayed', 'failed', 'completed');
      return {
        waiting: counts.waiting ?? 0,
        prioritized: counts.prioritized ?? 0,
        active: counts.active ?? 0,
        delayed: counts.delayed ?? 0,
        failed: counts.failed ?? 0,
        completed: counts.completed ?? 0,
      };
    },
  };
};
