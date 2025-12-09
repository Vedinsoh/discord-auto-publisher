import type { InfoResponse } from '@ap/express';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

/**
 * Get info from backend and crosspost-worker
 * Proxies queue metrics from crosspost-worker
 */
const get = async (): Promise<InfoResponse> => {
  try {
    // Get channels cache size from backend
    const channelsCacheSize = await Services.Channels.getSize();

    // Fetch queue metrics from crosspost-worker
    const workerResponse = await fetch('http://crosspost-worker:8082/metrics');

    if (!workerResponse.ok) {
      throw new Error(`Worker metrics failed: ${workerResponse.status}`);
    }

    const workerData = await workerResponse.json();

    return {
      size: channelsCacheSize,
      pending: workerData.data.queue.pending,
      channelQueues: workerData.data.queue.channelQueues,
      paused: workerData.data.queue.paused,
      rateLimitsSize: workerData.data.cache.rateLimits,
    };
  } catch (error) {
    logger.error(error);
    throw new Error('Error getting info');
  }
};

export const Info = {
  get,
};
