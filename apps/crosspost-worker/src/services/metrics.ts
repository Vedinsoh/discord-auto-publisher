import { ResponseStatus, ServiceResponse } from 'data/models/serviceResponse.js';
import { StatusCodes } from 'http-status-codes';
import { Services } from 'services/index.js';

/**
 * Get crosspost worker metrics
 */
const get = async () => {
  try {
    const queueInfo = Services.Crosspost.Queue.getInfo();
    const rateLimitsSize = await Services.RateLimitsCache.getSize();

    return new ServiceResponse(
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
    Services.Logger.error(error);

    return new ServiceResponse(
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
