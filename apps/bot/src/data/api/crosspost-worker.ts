import { RequestMethod, type Snowflake } from 'discord.js';

const baseUrl = 'http://crosspost-worker:8082';

// Crossposts
// MIGRATION: Added guildId in request body
// TODO: After migration (6 months), remove guildId from body
const pushCrosspost = async (guildId: Snowflake, channelId: Snowflake, messageId: Snowflake) => {
  return fetch(`${baseUrl}/enqueue/${channelId}/${messageId}`, {
    method: RequestMethod.Post,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guildId }),
  });
};

export const CrosspostWorker = {
  pushCrosspost,
};
