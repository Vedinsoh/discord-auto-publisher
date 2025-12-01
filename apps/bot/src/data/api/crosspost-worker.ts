import { RequestMethod, type Snowflake } from 'discord.js';

const baseUrl = 'http://crosspost-worker:8082';

// Crossposts
const pushCrosspost = async (channelId: Snowflake, messageId: Snowflake) => {
  return fetch(`${baseUrl}/enqueue/${channelId}/${messageId}`, {
    method: RequestMethod.Post,
  });
};

export const CrosspostWorker = {
  pushCrosspost,
};
