import { RequestMethod, type Snowflake } from 'discord.js';

const baseUrl = 'http://backend:8080';

// Channels
const addChannel = async (guildId: Snowflake, channelId: Snowflake) => {
  return fetch(`${baseUrl}/channel/${channelId}`, {
    method: RequestMethod.Put,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ guildId }),
  });
};

const removeChannel = async (channelId: Snowflake) => {
  return fetch(`${baseUrl}/channel/${channelId}`, {
    method: RequestMethod.Delete,
  });
};

const getChannel = async (channelId: Snowflake) => {
  return fetch(`${baseUrl}/channel/${channelId}`, {
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
const addFilter = async (channelId: Snowflake, filterData: unknown) => {
  return fetch(`${baseUrl}/channel/${channelId}/filter`, {
    method: RequestMethod.Post,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filterData),
  });
};

const removeFilter = async (channelId: Snowflake, filterId: string) => {
  return fetch(`${baseUrl}/channel/${channelId}/filter/${filterId}`, {
    method: RequestMethod.Delete,
  });
};

const getFilters = async (channelId: Snowflake) => {
  return fetch(`${baseUrl}/channel/${channelId}/filter`, {
    method: RequestMethod.Get,
  });
};

const updateFilter = async (channelId: Snowflake, filterId: string, filterData: unknown) => {
  return fetch(`${baseUrl}/channel/${channelId}/filter/${filterId}`, {
    method: RequestMethod.Put,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filterData),
  });
};

const updateFilterMode = async (channelId: Snowflake, mode: 'any' | 'all') => {
  return fetch(`${baseUrl}/channel/${channelId}/filter-mode`, {
    method: RequestMethod.Put,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode }),
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
  updateFilter,
  updateFilterMode,
};
