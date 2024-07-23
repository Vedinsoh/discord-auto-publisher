import { Routes } from 'discord-api-types/v10';

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

export const Discord = {
  routes,
  safeErrorCodes,
};
