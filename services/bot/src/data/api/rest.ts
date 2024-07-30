import { RequestMethod, type Snowflake } from 'discord.js';
import { env } from '#utils/config';

// TODO REST instance
const baseUrl = `http://rest:${env.REST_PORT}`;

// Crossposts
const pushCrosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return fetch(`${baseUrl}/crosspost/${channelId}/${messageId}`, {
    method: RequestMethod.Post,
  });
};

// Presence
const getGuildsCount = async (appId: Snowflake) => {
  return fetch(`${baseUrl}/presence/${appId}`);
};

const getTotalGuildsCount = async () => {
  return fetch(`${baseUrl}/presence`);
};

const updateGuildsCount = async (appId: Snowflake, count: number) => {
  return fetch(`${baseUrl}/presence/${appId}`, {
    method: RequestMethod.Put,
    body: JSON.stringify({
      count,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Info
const getInfo = async () => {
  return fetch(`${baseUrl}/info`);
};

export const REST = { pushCrosspost, getGuildsCount, getTotalGuildsCount, updateGuildsCount, getInfo };
