import { Snowflake } from 'discord-api-types/v10';
import { StatusCodes } from 'http-status-codes';

import { Data } from '@/data';
import { ResponseStatus, ServiceResponse } from '@/data/models/serviceResponse';
import { logger } from '@/server';

const push = async (channelId: Snowflake, messageId: Snowflake) => {
  try {
    // TODO add to queue
    await Data.API.Discord.crosspost(channelId, messageId);

    // TODO increment crossposts cache counter

    logger.debug(`Message pushed to crosspost queue: ${messageId}`);

    return new ServiceResponse(
      ResponseStatus.Success,
      'Message pushed to crosspost queue',
      {
        pushed: true,
      },
      StatusCodes.OK
    );
  } catch (error) {
    logger.error(error);

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
