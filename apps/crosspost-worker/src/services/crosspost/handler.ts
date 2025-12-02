import { invalidRequestCodes, safeErrorCodes } from '@ap/discord-api';
import { ResponseStatus, ServiceResponseImpl } from '@ap/types';
import { msToSec, sleep } from '@ap/utils';
import { DiscordAPIError, RateLimitError } from '@discordjs/rest';
import type { Snowflake } from 'discord-api-types/globals';
import { RESTJSONErrorCodes as ErrorCodes } from 'discord-api-types/v10';
import { StatusCodes } from 'http-status-codes';
import { Backend } from 'services/backend.js';
import { Discord } from 'services/discord.js';
import { Services } from 'services/index.js';

/**
 * Submit message for crossposting
 * @param channelId ID of the channel
 * @param messageId ID of the message
 */
export const submit = async (channelId: Snowflake, messageId: Snowflake, retries = 0) => {
  // Check if the message has reached the max retries
  if (retries >= 10) {
    return;
  }

  try {
    // Check if the channel is over the crossposts limit
    const isOverLimit = await Services.Crosspost.Counter.isOverLimit(channelId);
    if (isOverLimit) return;

    // Crosspost the message & increment the counter for the channel
    await Discord.crosspost(channelId, messageId);
    await Services.Crosspost.Counter.increment(channelId);

    Services.Logger.debug(`Crossposted message ${messageId} in channel ${channelId}`);
  } catch (error: unknown) {
    // Handle Discord rate limit errors
    if (error instanceof RateLimitError) {
      // Add the rate limit to the cache
      // Shared rate limits are not counted against the bot
      if (error.scope !== 'shared') {
        Services.RateLimitsCache.add(429);
      }

      // Pause the global queue if the rate limit is global
      if (error.global) {
        Services.Crosspost.Queue.pause(error.retryAfter);
      }

      // Handle non-sublimit rate limits
      if (error.sublimitTimeout === 0) {
        await sleep(error.retryAfter);
        Services.Crosspost.Queue.add(channelId, messageId, retries + 1);
        return;
      }

      // Set the crossposts counter for the channel with the sublimit
      Services.Crosspost.Counter.set(channelId, {
        count: 10,
        expiry: Math.ceil(msToSec(error.sublimitTimeout)) || undefined,
      });

      return;
    }

    // Handle Discord API errors
    if (error instanceof DiscordAPIError) {
      const errorCode = typeof error.code === 'string' ? parseInt(error.code, 10) : error.code;

      // Cache the invalid request status codes
      if (invalidRequestCodes.includes(error.status)) {
        Services.RateLimitsCache.add(error.status);
      }

      // Increment the counter if the message was already crossposted
      if (errorCode === ErrorCodes.ThisMessageWasAlreadyCrossposted) {
        Services.Crosspost.Counter.increment(channelId);
      }

      // Handle missing permissions error - notify backend to cleanup channel
      if (errorCode === ErrorCodes.MissingPermissions || errorCode === ErrorCodes.MissingAccess) {
        Services.Logger.debug(
          `Bot lost access to channel ${channelId}, notifying backend for cleanup`
        );
        // TODO don't immediately cleanup, instead mark channel as incorrect for later disable
        await Backend.cleanupChannel(channelId);
        return;
      }

      // Handle unknown channel error (channel deleted) - notify backend to cleanup channel
      if (errorCode === ErrorCodes.UnknownChannel) {
        Services.Logger.debug(
          `Channel ${channelId} no longer exists, notifying backend for cleanup`
        );
        await Backend.cleanupChannel(channelId);
        return;
      }

      // Check if the error code is safe to ignore
      if (safeErrorCodes.crosspost?.includes(errorCode)) {
        return;
      }
    }

    // Log the error if it's not handled above
    Services.Logger.error(error);
  }
};

/**
 * Push message to crosspost queue
 * @param channelId ID of the channel
 * @param messageId ID of the message
 * @returns ServiceResponse
 */
export const push = async (channelId: Snowflake, messageId: Snowflake) => {
  try {
    // TODO: MIGRATION MODE - Remove this comment block after migration period ends
    // During migration: Allow all announcement channels to auto-publish regardless of cache
    // After migration: Uncomment the cache check below to enforce enabled-channels-only
    /*
    // Check if channel is in cache (i.e., enabled for auto-publishing)
    const isChannelEnabled = await ChannelsCache.get(channelId);

    if (!isChannelEnabled) {
      Services.Logger.debug(
        `Channel ${channelId} not enabled for auto-publishing, skipping message ${messageId}`
      );

      return new ServiceResponseImpl(
        ResponseStatus.Failed,
        'Channel not enabled for auto-publishing',
        {
          pushed: false,
        },
        StatusCodes.NOT_FOUND
      );
    }
    */

    Services.Crosspost.Queue.add(channelId, messageId);

    Services.Logger.debug(`Message ${messageId} pushed to crosspost queue`);

    return new ServiceResponseImpl(
      ResponseStatus.Success,
      'Message pushed to crosspost queue',
      {
        pushed: true,
      },
      StatusCodes.OK
    );
  } catch (error) {
    Services.Logger.error(error);

    return new ServiceResponseImpl(
      ResponseStatus.Failed,
      'Error pushing message to crosspost queue',
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
