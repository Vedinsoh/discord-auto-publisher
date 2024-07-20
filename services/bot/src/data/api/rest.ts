import type { Snowflake } from 'discord.js';
import config from '#config';

// TODO REST instance

const baseUrl = `http://rest:${config.restPort}`;

const pushCrosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return fetch(`${baseUrl}/crosspost/${channelId}/${messageId}`, {
    method: 'POST',
  });
};

export const REST = { pushCrosspost };
