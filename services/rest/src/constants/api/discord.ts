import { Routes } from 'discord-api-types/v10';
import { StatusCodes } from 'http-status-codes';

const routes = {
  crosspost: Routes.channelMessageCrosspost(':id', ':id'),
};

const safeErrorCodes: { [key: string]: number[] } = {
  crosspost: [
    10003, // Unknown channel
    10008, // Unknown message
    40033, // Already crossposted
    50001, // Missing access
    50013, // Missing permissions
    50068, // Invalid message type
  ],
};

const invalidRequestCodes = [
  StatusCodes.UNAUTHORIZED, // 401
  StatusCodes.FORBIDDEN, // 403
  StatusCodes.TOO_MANY_REQUESTS, // 429
];

export const Discord = {
  routes,
  safeErrorCodes,
  invalidRequestCodes,
};
