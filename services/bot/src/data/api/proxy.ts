import type { Snowflake } from 'discord.js';

const baseUrl = 'http://discord-proxy:8080';
const FETCH_TIMEOUT_MS = 5_000;

const enqueueCrosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return fetch(`${baseUrl}/crosspost/${channelId}/${messageId}`, {
    method: 'POST',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
};

const clearBlocked = async (channelId: Snowflake) => {
  return fetch(`${baseUrl}/internal/blocked/${channelId}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
};

const getInfo = async () => {
  return fetch(`${baseUrl}/info`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
};

export const Proxy = { enqueueCrosspost, clearBlocked, getInfo };
