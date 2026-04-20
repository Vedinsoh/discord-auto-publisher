import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/data/models/serviceResponse';

import { Services } from '.';

/**
 * Get info about the crosspost service
 */
const get = async () => {
  try {
    const queue = Services.Crosspost.Queue.getInfo();
    const rateLimitsSize = await Services.RateLimitsCache.getSize();
    const channelsCount = await Services.Crosspost.Counter.getChannelsCount();

    return new ServiceResponse(
      ResponseStatus.Success,
      'Info',
      {
        queue,
        rateLimitsSize,
        channelsCount,
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
