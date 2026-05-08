import type { RequestHandler } from 'express';
import type { CantPostCache, SublimitCounter } from '../crosspost/caches.js';
import type { CrosspostQueueModule } from '../crosspost/queue.js';
import type { Gateway } from '../gateway/index.js';
import { logger } from '../logger.js';

export const createInfoHandler = (deps: {
  gateway: Gateway;
  crosspost: CrosspostQueueModule;
  caches: { cantPost: CantPostCache; sublimit: SublimitCounter };
}): RequestHandler => async (_req, res) => {
  try {
    const [queueStats, channelsCount, cantPostCount] = await Promise.all([
      deps.crosspost.stats(),
      deps.caches.sublimit.size(),
      deps.caches.cantPost.size(),
    ]);
    res.status(200).json({
      data: {
        rest: deps.gateway.stats(),
        queue: queueStats,
        channelsCount,
        cantPostCount,
      },
    });
  } catch (error) {
    logger.error({ event: 'info.failed', err: error });
    res.status(500).end();
  }
};
