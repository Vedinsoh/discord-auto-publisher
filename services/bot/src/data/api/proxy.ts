import type { Snowflake } from 'discord.js';

const baseUrl = 'http://discord-proxy:8080';

const pushCrosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return fetch(`${baseUrl}/api/v10/channels/${channelId}/messages/${messageId}/crosspost`, {
    method: 'POST',
  });
};

const getInfo = async () => {
  return fetch(`${baseUrl}/info`);
};

export const Proxy = { pushCrosspost, getInfo };
