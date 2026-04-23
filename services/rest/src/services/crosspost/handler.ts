import { DiscordAPIError, RateLimitError } from '@discordjs/rest';
import { Snowflake } from 'discord-api-types/globals';
import { RESTJSONErrorCodes as ErrorCodes } from 'discord-api-types/v10';
import { StatusCodes } from 'http-status-codes';

import { Constants } from '@/constants';
import { Data } from '@/data';
import { ResponseStatus, ServiceResponse } from '@/data/models/serviceResponse';
import { Services } from '@/services';
import { msToSec } from '@/utils/timeConversions';

/**
 * Submit message for crossposting
 * @param channelId ID of the channel
 * @param messageId ID of the message
 */
const submit = async (channelId: Snowflake, messageId: Snowflake) => {
  try {
    // Check if the channel is over the crossposts limit
    const isOverLimit = await Services.Crosspost.Counter.isOverLimit(channelId);
    if (isOverLimit) return;

    // Crosspost the message & increment the counter for the channel
    await Data.API.Discord.crosspost(channelId, messageId);
    await Services.Crosspost.Counter.increment(channelId);

    Services.Logger.debug(`Crossposted message ${messageId} in channel ${channelId}`);
  } catch (error: DiscordAPIError | RateLimitError | unknown) {
    Services.Logger.warn(error);

    // Handle Discord rate limit errors (sublimits only — route-level limits are auto-retried)
    // rejectOnRateLimit fires for: post-429 sublimits (scope='shared') and pre-flight waits
    // on sublimit-locked buckets (timeToReset>60s), routing both cases here
    if (error instanceof RateLimitError) {
      Services.Crosspost.Counter.set(channelId, {
        count: 10,
        expiry: Math.ceil(msToSec(error.retryAfter)),
      });
      return;
    }

    // Handle Discord API errors
    if (error instanceof DiscordAPIError) {
      const code = typeof error.code === 'string' ? parseInt(error.code) : error.code;

      // Cache the invalid request status codes for Cloudflare ban protection
      if (Constants.API.Discord.invalidRequestCodes.includes(error.status)) {
        Services.RateLimitsCache.add(error.status);
      }

      // Increment the counter if the message was already crossposted
      if (code === ErrorCodes.ThisMessageWasAlreadyCrossposted) {
        Services.Crosspost.Counter.increment(channelId);
      }

      // Check if the error code is safe to ignore
      if (Constants.API.Discord.safeErrorCodes.crosspost.includes(code)) {
        return;
      }
    }

    // Log the error if it's not handled above
    Services.Logger.error(error);
  }
};

/**
 * Push message for crossposting
 * @param channelId ID of the channel
 * @param messageId ID of the message
 * @returns ServiceResponse
 */
const push = async (channelId: Snowflake, messageId: Snowflake) => {
  try {
    // Submit directly — discord.js handles per-channel bucketing and rate limit retries
    submit(channelId, messageId);

    return new ServiceResponse(
      ResponseStatus.Success,
      'Message submitted for crossposting',
      {
        pushed: true,
      },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error submitting message for crossposting',
      {
        pushed: false,
      },
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const Handler = {
  push,
  submit,
};
