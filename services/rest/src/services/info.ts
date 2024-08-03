import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/data/models/serviceResponse';

import { Services } from '.';

/**
 * Get info about the crosspost service
 */
const get = async () => {
  try {
    const info = Services.Crosspost.Queue.getInfo();
    const rateLimitsSize = await Services.RateLimitsCache.getSize();

    return new ServiceResponse(
      ResponseStatus.Success,
      'Info',
      {
        ...info,
        rateLimitsSize,
      },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

    return new ServiceResponse(ResponseStatus.Failed, 'Error getting info', null, StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const Info = {
  get,
};
