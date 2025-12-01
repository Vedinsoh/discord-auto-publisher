import { RequestMethod, type Snowflake } from 'discord.js';

const baseUrl = 'http://backend:8080';

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
const getGuildChannels = async (guildId: Snowflake) => {
  return fetch(`${baseUrl}/guild/${guildId}/channels`, {
    method: RequestMethod.Get,
  });
};

const deleteGuild = async (guildId: Snowflake) => {
  return fetch(`${baseUrl}/guild/${guildId}`, {
    method: RequestMethod.Delete,
  });
};

// Info
const getInfo = async () => {
  return fetch(`${baseUrl}/info`);
};

export const Backend = {
  getInfo,
  addChannel,
  removeChannel,
  getChannel,
  getGuildChannels,
  deleteGuild,
};
