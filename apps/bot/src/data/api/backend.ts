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

// Filters
const addFilter = async (guildId: Snowflake, channelId: Snowflake, filterData: unknown) => {
  return fetch(`${baseUrl}/channel/${guildId}/${channelId}/filters`, {
    method: RequestMethod.Post,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filterData),
  });
};

const removeFilter = async (guildId: Snowflake, channelId: Snowflake, filterId: string) => {
  return fetch(`${baseUrl}/channel/${guildId}/${channelId}/filters/${filterId}`, {
    method: RequestMethod.Delete,
  });
};

const getFilters = async (guildId: Snowflake, channelId: Snowflake) => {
  return fetch(`${baseUrl}/channel/${guildId}/${channelId}/filters`, {
    method: RequestMethod.Get,
  });
};

export const Backend = {
  getInfo,
  addChannel,
  removeChannel,
  getChannel,
  getGuildChannels,
  deleteGuild,
  addFilter,
  removeFilter,
  getFilters,
};
