import { RequestMethod, type Snowflake } from 'discord.js';

// TODO REST instance
const baseUrl = 'http://bot-api:8080';

// Crossposts
const pushCrosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return fetch(`${baseUrl}/crosspost/${channelId}/${messageId}`, {
    method: RequestMethod.Post,
  });
};

// Info
const getInfo = async () => {
  return fetch(`${baseUrl}/info`);
};

export const Bot = {
  pushCrosspost,
  getInfo,
};
