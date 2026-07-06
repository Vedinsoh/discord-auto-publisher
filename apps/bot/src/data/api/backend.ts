import { env } from '@ap/config';
import type { CreateFilter, FilterMatchMode } from '@ap/validations';
import { RequestMethod, type Snowflake } from 'discord.js';

const baseUrl = 'http://backend:8080';
// The single backend tracks presence per edition — every guild lifecycle call carries ours
const edition = env.APP_EDITION;

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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ edition }),
  });
};

// Register guild on join/re-invite: upsert guild row, activate this edition's
// presence, prune config for channels deleted while the bot was away, rebuild
// derived cache; the backend runs the join orchestration (entitlement gate,
// premium handover, free leave while premium manages)
const registerNewGuild = async (guildId: Snowflake, announcementChannelIds: Snowflake[]) => {
  return fetch(`${baseUrl}/guild/${guildId}/new`, {
    method: RequestMethod.Post,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ edition, announcementChannelIds }),
  });
};

// Permission-change ping while a premium handover is pending — the backend
// re-evaluates the premium bot's effective permissions and swaps when all pass
const pingHandoverEvaluate = async (guildId: Snowflake) => {
  return fetch(`${baseUrl}/internal/handover/${guildId}/evaluate`, {
    method: RequestMethod.Post,
  });
};

// Info
const getInfo = async () => {
  return fetch(`${baseUrl}/info`);
};

// Filters
const addFilter = async (channelId: Snowflake, filterData: CreateFilter) => {
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

const updateFilter = async (channelId: Snowflake, filterId: string, filterData: CreateFilter) => {
  return fetch(`${baseUrl}/channel/${channelId}/filter/${filterId}`, {
    method: RequestMethod.Put,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filterData),
  });
};

const setFilterMode = async (channelId: Snowflake, mode: FilterMatchMode) => {
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
  registerNewGuild,
  pingHandoverEvaluate,
  addFilter,
  removeFilter,
  getFilters,
  updateFilter,
  setFilterMode,
};
