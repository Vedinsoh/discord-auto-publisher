import { DiscordAPIError } from '@discordjs/rest';
import { Snowflake } from 'discord-api-types/globals';
import { StatusCodes } from 'http-status-codes';

import { Constants } from '@/constants';
import { Data } from '@/data';
import { ResponseStatus, ServiceResponse } from '@/data/models/serviceResponse';
import { Services } from '@/services';

/**
 * Submit message for crossposting
 * @param channelId ID of the channel
 * @param messageId ID of the message
 */
const submit = async (channelId: Snowflake, messageId: Snowflake) => {
  try {
    // Crosspost the message
    await Data.API.Discord.crosspost(channelId, messageId);
    // Increment crossposts counter for the channel
    await Services.CrosspostsCounter.increment(channelId);

    Services.Logger.debug(`Crossposted message ${messageId} in channel ${channelId}`);
  } catch (error: DiscordAPIError | unknown) {
    // Handle Discord API errors
    if (error instanceof DiscordAPIError) {
      const code = typeof error.code === 'string' ? parseInt(error.code) : error.code;

      // Check if the error is due to rate limiting
      if (error.status === 403) {
        Services.RateLimitsCache.add(error.status);
      }

      // Check if the error code is safe to ignore
      if (Constants.API.Discord.safeErrorCodes.crosspost.includes(code)) {
        return;
      }
    }

    Services.Logger.error(error);
  }
};

/**
 * Push message to crosspost queue
 * @param channelId ID of the channel
 * @param messageId ID of the message
 * @returns ServiceResponse
 */
const push = async (channelId: Snowflake, messageId: Snowflake) => {
  try {
    global.messagesQueue.add(channelId, messageId);

    Services.Logger.debug(`Message ${messageId} pushed to crosspost queue`);

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
  submit,
};
