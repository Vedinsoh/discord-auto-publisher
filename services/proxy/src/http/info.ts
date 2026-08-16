import type { RequestHandler } from 'express';
import type { BlockedCache, BoostBudget, SublimitCounter } from '../crosspost/caches.js';
import type { CrosspostQueueModule } from '../crosspost/queue.js';
import type { Gateway } from '../gateway/index.js';
import { logger } from '../logger.js';

export const createInfoHandler = (deps: {
  gateway: Gateway;
  crosspost: CrosspostQueueModule;
  caches: { blocked: BlockedCache; sublimit: SublimitCounter };
  boostBudget: BoostBudget;
}): RequestHandler => async (_req, res) => {
  try {
    const [queueStats, sublimitCount, blockedCount, boostedCount] = await Promise.all([
      deps.crosspost.stats(),
      deps.caches.sublimit.size(),
      deps.caches.blocked.size(),
      deps.boostBudget.size(),
    ]);
    res.status(200).json({
      data: {
        rest: deps.gateway.stats(),
        queue: queueStats,
        sublimitCount,
        blockedCount,
        boostedCount,
      },
    });
  } catch (error) {
    logger.error({ event: 'info.failed', err: error });
    res.status(500).end();
  }
};
