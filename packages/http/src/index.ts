import { getReasonPhrase, StatusCodes } from 'http-status-codes';

export { StatusCodes, getReasonPhrase };

// Internal REST API routes
export const RestApiRoutes = {
  crosspost: '/crosspost/:channelId/:messageId',
  info: '/info',
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

export const buildInfoUrl = (baseUrl: string): string => {
  return createRestApiUrl(baseUrl, '/info');
};
