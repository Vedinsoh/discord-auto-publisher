import { StatusCodes } from '@ap/express';
import { RESTJSONErrorCodes as ErrorCodes } from 'discord-api-types/v10';

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
  safeErrorCodes,
  invalidRequestCodes,
};
