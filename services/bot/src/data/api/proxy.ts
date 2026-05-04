import type { Snowflake } from 'discord.js';

const baseUrl = 'http://discord-proxy:8080';
const FETCH_TIMEOUT_MS = 35_000;

const pushCrosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return fetch(`${baseUrl}/api/v10/channels/${channelId}/messages/${messageId}/crosspost`, {
    method: 'POST',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
};

const getInfo = async () => {
  return fetch(`${baseUrl}/info`, { signal: AbortSignal.timeout(5_000) });
};

export const Proxy = { pushCrosspost, getInfo };
