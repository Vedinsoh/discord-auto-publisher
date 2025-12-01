import { RESTJSONErrorCodes as ErrorCodes } from 'discord-api-types/v10';
import { StatusCodes } from 'http-status-codes';

export const safeErrorCodes: { [key: string]: ErrorCodes[] } = {
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

export const invalidRequestCodes: StatusCodes[] = [
  StatusCodes.UNAUTHORIZED,
  StatusCodes.FORBIDDEN,
  StatusCodes.TOO_MANY_REQUESTS,
];
