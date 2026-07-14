import { env } from '@ap/config';
import { secToMs, sleep } from '@ap/utils';
import type { CreateFilter, FilterMatchMode } from '@ap/validations';
import { RequestMethod, type Snowflake } from 'discord.js';
import { logger } from 'utils/logger.js';

const baseUrl = 'http://backend:8080';
// The single backend tracks presence per edition — every guild lifecycle call carries ours
const edition = env.APP_EDITION;

const request = async (path: string, init?: RequestInit): Promise<Response> => {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    // Surface backend rejections — swallowed, a failed registration is
    // indistinguishable from success (bot in guild, dashboard says absent)
    logger.warn(
      `Backend request failed: ${init?.method ?? RequestMethod.Get} ${path} → ${response.status}`
    );
  }
  return response;
};

const LIFECYCLE_RETRY_ATTEMPTS = 3;

// Guild lifecycle events are one-shot — Discord never re-emits a missed join
// or leave, and a lost call means wrong presence until the next reconcile
// sweep — so transient failures (network, 5xx) are retried before giving up
const lifecycleRequest = async (path: string, init: RequestInit): Promise<Response> => {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await request(path, init);
      if (response.ok || response.status < 500 || attempt >= LIFECYCLE_RETRY_ATTEMPTS) {
        return response;
      }
    } catch (error) {
      if (attempt >= LIFECYCLE_RETRY_ATTEMPTS) throw error;
      logger.warn(error, `Backend request errored: ${init.method} ${path} (attempt ${attempt})`);
    }
    await sleep(secToMs(2 * attempt));
  }
};

// Channels
const addChannel = async (guildId: Snowflake, channelId: Snowflake) => {
  return request(`/channel/${channelId}`, {
    method: RequestMethod.Put,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ guildId }),
  });
};

const removeChannel = async (channelId: Snowflake) => {
  return request(`/channel/${channelId}`, {
    method: RequestMethod.Delete,
  });
};

const getChannel = async (channelId: Snowflake) => {
  return request(`/channel/${channelId}`, {
    method: RequestMethod.Get,
  });
};

// Guilds
const getGuildChannels = async (guildId: Snowflake) => {
  return request(`/guild/${guildId}/channels`, {
    method: RequestMethod.Get,
  });
};

const deleteGuild = async (guildId: Snowflake) => {
  return lifecycleRequest(`/guild/${guildId}`, {
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
  return lifecycleRequest(`/guild/${guildId}/new`, {
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
  return request(`/internal/handover/${guildId}/evaluate`, {
    method: RequestMethod.Post,
  });
};

// Publish-state push (ADR 0008): this edition's per-channel crosspost capability
// computed off the gateway cache. `full` (a reconnect/join sweep) lets the
// backend drop this edition's stale fields; incremental pushes only upsert.
const pushChannelPermissions = async (
  guildId: Snowflake,
  channels: { channelId: Snowflake; canPublish: boolean; missing: string[] }[],
  full: boolean
) => {
  return request(`/internal/channel-permissions/${guildId}`, {
    method: RequestMethod.Post,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ edition, full, channels }),
  });
};

// Channel-list cache invalidation (ADR 0007 amendment): an announcement channel
// was created/deleted or crossed the type boundary — bust the backend's cached
// candidate list so the dashboard reflects it without the 5-min TTL wait.
const invalidateGuildChannels = async (guildId: Snowflake) => {
  return request(`/internal/guild/${guildId}/channels/invalidate`, {
    method: RequestMethod.Post,
  });
};

// Info
const getInfo = async () => {
  return request('/info');
};

// Filters
const addFilter = async (channelId: Snowflake, filterData: CreateFilter) => {
  return request(`/channel/${channelId}/filter`, {
    method: RequestMethod.Post,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filterData),
  });
};

const removeFilter = async (channelId: Snowflake, filterId: string) => {
  return request(`/channel/${channelId}/filter/${filterId}`, {
    method: RequestMethod.Delete,
  });
};

const getFilters = async (channelId: Snowflake) => {
  return request(`/channel/${channelId}/filter`, {
    method: RequestMethod.Get,
  });
};

const updateFilter = async (channelId: Snowflake, filterId: string, filterData: CreateFilter) => {
  return request(`/channel/${channelId}/filter/${filterId}`, {
    method: RequestMethod.Put,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filterData),
  });
};

const setFilterMode = async (channelId: Snowflake, mode: FilterMatchMode) => {
  return request(`/channel/${channelId}/filter-mode`, {
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
  pushChannelPermissions,
  invalidateGuildChannels,
  addFilter,
  removeFilter,
  getFilters,
  updateFilter,
  setFilterMode,
};
