import { Data } from 'data/index.js';
import { logger } from 'utils/logger.js';
import { Services } from './index.js';

export interface MetricsResponse {
  queue: {
    pending: number;
    channelQueues: number;
    paused: boolean;
  };
  cache: {
    rateLimits: number;
  };
}

/**
 * Get crosspost worker metrics
 */
const get = async (): Promise<MetricsResponse> => {
  try {
    const queueInfo = Services.Crosspost.Queue.getInfo();
    const rateLimitsSize = await Data.Cache.RateLimits.getSize();

    return {
      queue: {
        ...queueInfo,
      },
      cache: {
        rateLimits: rateLimitsSize,
      },
    };
  } catch (error) {
    logger.error(error);
    throw new Error('Error getting metrics');
  }
};

export const Metrics = {
  get,
};
