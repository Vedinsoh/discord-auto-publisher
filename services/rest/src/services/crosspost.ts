import { Snowflake } from 'discord-api-types/globals';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/data/models/serviceResponse';
import { Services } from '@/services';

const push = async (channelId: Snowflake, messageId: Snowflake) => {
  try {
    // TODO add to queue
    global.messagesQueue.add(channelId, messageId);

    // TODO increment crossposts cache counter

    Services.Logger.debug(`Message pushed to crosspost queue: ${messageId}`);

    return new ServiceResponse(
      ResponseStatus.Success,
      'Message pushed to crosspost queue',
      {
        pushed: true,
      },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

    // TODO cache request limits

    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error pushing message to crosspost queue',
      {
        pushed: false,
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const Crosspost = {
  push,
};
