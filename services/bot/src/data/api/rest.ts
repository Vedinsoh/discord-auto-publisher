import { RequestMethod, type Snowflake } from 'discord.js';
import { env } from '#utils/config';

// TODO REST instance

const baseUrl = `http://rest:${env.REST_PORT}`;

const pushCrosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return fetch(`${baseUrl}/crosspost/${channelId}/${messageId}`, {
    method: RequestMethod.Post,
  });
};

export const REST = { pushCrosspost };
