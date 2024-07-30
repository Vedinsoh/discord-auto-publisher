import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/data/models/serviceResponse';

import { Services } from '.';
import { MessagesQueue } from './messagesQueue';

const get = async () => {
  try {
    // TODO fix types
    const messagesQueue = new MessagesQueue();
    const data = messagesQueue.getQueueData() as ReturnType<typeof messagesQueue.getQueueData>;

    return new ServiceResponse(
      ResponseStatus.Success,
      'Info',
      {
        ...data,
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
