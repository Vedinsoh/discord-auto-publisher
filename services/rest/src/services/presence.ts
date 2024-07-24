import { StatusCodes } from 'http-status-codes';

import { Data } from '@/data';
import { ResponseStatus, ServiceResponse } from '@/data/models/serviceResponse';
import { Services } from '@/services';

/**
 * Get total count of all bot clients
 * @returns Total count of all bot clients
 */
const getTotalCount = async () => {
  try {
    const botClients = await Data.Repo.BotClients.findMany();
    const totalCount = botClients.reduce((acc, client) => acc + client.guildsCount, 0);

    return new ServiceResponse(
      ResponseStatus.Success,
      'Total count of all bot clients',
      {
        count: totalCount,
      },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error getting total count of all bot clients',
      {
        error,
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Update count of the bot client
 * @param appId App ID of the bot client
 * @param count New count
 * @returns Updated bot client
 */
const updateCount = async (appId: string, count: number) => {
  try {
    await Data.Repo.BotClients.update(appId, { guildsCount: count });

    return new ServiceResponse(
      ResponseStatus.Success,
      'Bot client count updated',
      {
        appId,
        count,
      },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error updating bot client count',
      {
        error,
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const Presence = {
  getTotalCount,
  updateCount,
};
