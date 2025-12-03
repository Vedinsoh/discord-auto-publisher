import { ResponseStatus, ServiceResponseImpl } from '@ap/types';
import { StatusCodes } from 'http-status-codes';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

/**
 * Get info from backend  and crosspost-worker
 * Proxies queue metrics from crosspost-worker
 */
const get = async () => {
  try {
    // Get channels cache size from backend
    const channelsCacheSize = await Services.Channels.DB.getSize();

    // Fetch queue metrics from crosspost-worker
    const workerResponse = await fetch('http://crosspost-worker:8082/metrics');

    if (!workerResponse.ok) {
      throw new Error(`Worker metrics failed: ${workerResponse.status}`);
    }

    const workerData = await workerResponse.json();

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Info',
      {
        queue: workerData.data.queue,
        cache: {
          channels: channelsCacheSize,
          rateLimits: workerData.data.cache.rateLimits,
        },
      },
      StatusCodes.OK
    );
  } catch (error) {
    logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Error getting info',
      null,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const Info = {
  get,
};
