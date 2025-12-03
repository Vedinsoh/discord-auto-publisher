import { ResponseStatus, ServiceResponseImpl } from '@ap/types';
import { StatusCodes } from 'http-status-codes';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

/**
 * Get crosspost worker metrics
 */
const get = async () => {
  try {
    const queueInfo = Services.Crosspost.Queue.getInfo();
    const rateLimitsSize = await Services.RateLimitsCache.getSize();

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Metrics',
      {
        queue: {
          ...queueInfo,
        },
        cache: {
          rateLimits: rateLimitsSize,
        },
      },
      StatusCodes.OK
    );
  } catch (error) {
    logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Error getting metrics',
      null,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const Metrics = {
  get,
};
