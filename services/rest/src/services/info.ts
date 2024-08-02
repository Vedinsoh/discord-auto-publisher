import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/data/models/serviceResponse';

import { Services } from '.';

const get = async () => {
  try {
    const info = Services.Crosspost.Queue.getInfo();

    return new ServiceResponse(
      ResponseStatus.Success,
      'Info',
      {
        ...info,
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
