import { RESTJSONErrorCodes as ErrorCodes, Routes } from 'discord-api-types/v10';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

export { StatusCodes, getReasonPhrase };

// Internal REST API routes
export const RestApiRoutes = {
  crosspost: '/crosspost/:channelId/:messageId',
  presence: {
    base: '/presence',
    withId: '/presence/:appId',
  },
  info: '/info',
};

// Discord API constants
export const DiscordApi = {
  routes: {
    crosspost: Routes.channelMessageCrosspost(':id', ':id'),
  },
  safeErrorCodes: {
    crosspost: [
      ErrorCodes.UnknownChannel,
      ErrorCodes.UnknownGuild,
      ErrorCodes.UnknownMessage,
      ErrorCodes.ThisMessageWasAlreadyCrossposted,
      ErrorCodes.MissingAccess,
      ErrorCodes.MissingPermissions,
      ErrorCodes.InvalidMessageType,
    ],
  },
  invalidRequestCodes: [
    StatusCodes.UNAUTHORIZED, // 401
    StatusCodes.FORBIDDEN, // 403
    StatusCodes.TOO_MANY_REQUESTS, // 429
  ],
};

// Bot service API client helper
export const createRestApiUrl = (baseUrl: string, route: string): string => {
  return `${baseUrl}${route}`;
};

// Route builders
export const buildCrosspostUrl = (
  baseUrl: string,
  channelId: string,
  messageId: string
): string => {
  return createRestApiUrl(baseUrl, `/crosspost/${channelId}/${messageId}`);
};

export const buildPresenceUrl = (baseUrl: string, appId?: string): string => {
  return createRestApiUrl(baseUrl, appId ? `/presence/${appId}` : '/presence');
};

export const buildInfoUrl = (baseUrl: string): string => {
  return createRestApiUrl(baseUrl, '/info');
};
