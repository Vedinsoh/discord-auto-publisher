import { RESTJSONErrorCodes as ErrorCodes, Routes } from 'discord-api-types/v10';
import { StatusCodes } from 'http-status-codes';

const routes = {
  crosspost: Routes.channelMessageCrosspost(':id', ':id'),
};

const safeErrorCodes: { [key: string]: ErrorCodes[] } = {
  crosspost: [
    ErrorCodes.UnknownChannel,
    ErrorCodes.UnknownGuild,
    ErrorCodes.UnknownMessage,
    ErrorCodes.ThisMessageWasAlreadyCrossposted,
    ErrorCodes.MissingAccess,
    ErrorCodes.MissingPermissions,
    ErrorCodes.InvalidMessageType,
  ],
};

const invalidRequestCodes: StatusCodes[] = [
  StatusCodes.UNAUTHORIZED, // 401
  StatusCodes.FORBIDDEN, // 403
  StatusCodes.TOO_MANY_REQUESTS, // 429
];

export const Discord = {
  routes,
  safeErrorCodes,
  invalidRequestCodes,
};
