import { RequestMethod, type Snowflake } from 'discord.js';

// TODO REST instance
const baseUrl = 'http://bot-api:8080';

// Channels
const addChannel = async (guildId: Snowflake, channelId: Snowflake) => {
  return fetch(`${baseUrl}/channel/${guildId}/${channelId}`, {
    method: RequestMethod.Put,
  });
};

const removeChannel = async (guildId: Snowflake, channelId: Snowflake) => {
  return fetch(`${baseUrl}/channel/${guildId}/${channelId}`, {
    method: RequestMethod.Delete,
  });
};

const getChannel = async (guildId: Snowflake, channelId: Snowflake) => {
  return fetch(`${baseUrl}/channel/${guildId}/${channelId}`, {
    method: RequestMethod.Get,
  });
};

// Guilds
const deleteGuild = async (guildId: Snowflake) => {
  return fetch(`${baseUrl}/guild/${guildId}`, {
    method: RequestMethod.Delete,
  });
};

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
  addChannel,
  removeChannel,
  getChannel,
  deleteGuild,
};
