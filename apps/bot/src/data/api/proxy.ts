import { config } from '@ap/config';
import { RequestMethod, type Snowflake } from 'discord.js';

// This edition's proxy (per-edition services in the shared compose stack)
const baseUrl = config.proxyUrl;
const FETCH_TIMEOUT_MS = 5_000;

const enqueueCrosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return fetch(`${baseUrl}/crosspost/${channelId}/${messageId}`, {
    method: RequestMethod.Post,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
};

const clearBlocked = async (channelId: Snowflake) => {
  return fetch(`${baseUrl}/internal/blocked/${channelId}`, {
    method: RequestMethod.Delete,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
};

const getInfo = async () => {
  return fetch(`${baseUrl}/info`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
};

export const ProxyAPI = {
  enqueueCrosspost,
  clearBlocked,
  getInfo,
};
