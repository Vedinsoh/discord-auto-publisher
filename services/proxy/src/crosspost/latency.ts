import { logger } from '../logger.js';

const FLUSH_INTERVAL_MS = 60_000;

/**
 * Safety valve only — a minute of successes stays far below this at any throughput
 * this proxy has seen. `n` is the true count, kept separately from the buffer, so a
 * cap that did trip shows up as `capped: true` instead of silently skewing the tail.
 */
const MAX_SAMPLES_PER_TIER = 50_000;

export type LatencyTier = 'boosted' | 'normal';

type Bucket = { count: number; retried: number; samples: number[] };

type Summary = { n: number; retried: number; p50: number; p95: number; max: number; capped?: true };

export type LatencyReporter = {
  /**
   * @param totalMs enqueue → successful publish, so it includes any rate-limit bounce
   * @param retried whether this job was picked up more than once (see `retried` below)
   */
  record(tier: LatencyTier, totalMs: number, retried: boolean): void;
  flush(): void;
  stop(): void;
};

const emptyBucket = (): Bucket => ({ count: 0, retried: 0, samples: [] });

const percentile = (sorted: number[], p: number): number =>
  sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

const summarize = (bucket: Bucket): Summary => {
  // Field shape stays constant even for an idle tier — `n: 0` already says it is
  // empty, and a log query should not have to cope with missing keys.
  if (!bucket.samples.length) return { n: bucket.count, retried: bucket.retried, p50: 0, p95: 0, max: 0 };

  const sorted = [...bucket.samples].sort((a, b) => a - b);
  const summary: Summary = {
    n: bucket.count,
    // Splits queue depth from rate-limit bounce: `retried` jobs waited on Discord,
    // not on the queue, so a boosted tail made entirely of them is not a boost failure.
    retried: bucket.retried,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
  };
  if (bucket.count > sorted.length) summary.capped = true;
  return summary;
};

/**
 * Per-tier enqueue-to-publish latency, aggregated in memory and emitted once a minute.
 * The boosted-vs-normal gap on one instance at one moment is the measurement the
 * onboarding boost is judged on (ADR 0004); a per-job line would be thousands an hour.
 */
export const createLatencyReporter = (): LatencyReporter => {
  const buckets: Record<LatencyTier, Bucket> = { boosted: emptyBucket(), normal: emptyBucket() };

  const flush = () => {
    if (!buckets.boosted.count && !buckets.normal.count) return;
    logger.info({
      event: 'crosspost.latency',
      windowMs: FLUSH_INTERVAL_MS,
      boosted: summarize(buckets.boosted),
      normal: summarize(buckets.normal),
    });
    buckets.boosted = emptyBucket();
    buckets.normal = emptyBucket();
  };

  const timer = setInterval(flush, FLUSH_INTERVAL_MS);
  timer.unref();

  return {
    record: (tier, totalMs, retried) => {
      const bucket = buckets[tier];
      bucket.count += 1;
      if (retried) bucket.retried += 1;
      if (bucket.samples.length < MAX_SAMPLES_PER_TIER) bucket.samples.push(totalMs);
    },
    flush,
    stop: () => {
      clearInterval(timer);
      flush();
    },
  };
};
