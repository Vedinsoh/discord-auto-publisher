import type { Edition } from '@ap/api-types';
import { Keys } from '@ap/redis';
import { Data } from 'data/index.js';
import type { Snowflake } from 'discord-api-types/globals';
import type { APIChannel } from 'discord-api-types/v10';
import { logger } from 'utils/logger.js';
import { BotPermissions, type PublishEntry } from './botPermissions.js';

/**
 * Publish-state cache (ADR 0008): per-guild Redis hash of each bot's crosspost
 * capability per channel, PUSHED by the bots off their gateway cache (zero
 * Discord REST). The dashboard and the premium handover gate read it instead of
 * computing permissions via REST; `BotPermissions.getPublishMap` is the
 * write-back fallback for fields the bot hasn't reported yet.
 *
 * Key: `publish_state:{guildId}` → fields `{channelId}:{edition}` = `{c, m}` JSON.
 * A 14-day TTL backstops orphans from events missed while a bot was offline; the
 * bot's full sweep on reconnect replaces the edition's fields (self-heal).
 */

const TTL_SEC = 14 * 24 * 60 * 60;

const key = (guildId: Snowflake) => `${Keys.PublishState}:${guildId}`;
const field = (channelId: Snowflake, edition: Edition) => `${channelId}:${edition}`;

type StoredEntry = { c: boolean; m: string[] };

const encode = (entry: PublishEntry): string =>
  JSON.stringify({ c: entry.canPublish, m: entry.missing } satisfies StoredEntry);

const decode = (raw: string): PublishEntry | null => {
  try {
    const parsed = JSON.parse(raw) as StoredEntry;
    return { canPublish: !!parsed.c, missing: Array.isArray(parsed.m) ? parsed.m : [] };
  } catch {
    return null;
  }
};

/**
 * Persist an edition's per-channel publish entries. `full` (a bot sweep on
 * reconnect) drops the edition's stale fields not present in `entries`;
 * incremental pushes only upsert. TTL is refreshed on every write.
 */
const writeGuildEdition = async (
  guildId: Snowflake,
  edition: Edition,
  entries: { channelId: Snowflake; canPublish: boolean; missing: string[] }[],
  full: boolean
): Promise<void> => {
  const redis = Data.Drivers.Redis.PublishState;
  const hashKey = key(guildId);
  try {
    if (full) {
      const suffix = `:${edition}`;
      const existing = await redis.hkeys(hashKey);
      const keep = new Set(entries.map(e => field(e.channelId, edition)));
      const stale = existing.filter(f => f.endsWith(suffix) && !keep.has(f));
      if (stale.length > 0) await redis.hdel(hashKey, ...stale);
    }

    if (entries.length > 0) {
      const payload: Record<string, string> = {};
      for (const e of entries) {
        payload[field(e.channelId, edition)] = encode({
          canPublish: e.canPublish,
          missing: e.missing,
        });
      }
      await redis.hset(hashKey, payload);
    }

    await redis.expire(hashKey, TTL_SEC);
  } catch (error) {
    logger.warn(error, `Failed to write publish-state for guild ${guildId} (${edition})`);
  }
};

/**
 * `{channelId → {canPublish, missing}}` for an edition over `channels`: served
 * from the stored hash, with any missing fields computed once via the REST
 * fallback and written back. Never throws — a Redis failure degrades to a pure
 * REST computation.
 */
const getEditionMap = async (
  guildId: Snowflake,
  edition: Edition,
  channels: APIChannel[]
): Promise<Record<string, PublishEntry>> => {
  const map: Record<string, PublishEntry> = {};

  let stored: Record<string, string> = {};
  try {
    stored = await Data.Drivers.Redis.PublishState.hgetall(key(guildId));
  } catch (error) {
    logger.warn(error, `Failed to read publish-state for guild ${guildId}`);
  }

  const misses: APIChannel[] = [];
  for (const channel of channels) {
    const raw = stored[field(channel.id, edition)];
    const entry = raw ? decode(raw) : null;
    if (entry) map[channel.id] = entry;
    else misses.push(channel);
  }

  if (misses.length > 0) {
    let computed: Record<string, PublishEntry>;
    try {
      computed = await BotPermissions.getPublishMap(edition, guildId, misses);
    } catch (error) {
      // REST fallback blipped (Discord/proxy). Degrade to a usable read instead
      // of throwing (the docstring's "Never throws" contract): default the misses
      // to not-publishing and skip the write-back so a failure is never persisted.
      // Self-heals on the next load once the misses recompute successfully.
      logger.warn(error, `Failed to compute publish-state for guild ${guildId} (${edition})`);
      for (const channel of misses) map[channel.id] = { canPublish: false, missing: [] };
      return map;
    }
    const seeded = misses.map(channel => {
      const entry = computed[channel.id] ?? { canPublish: false, missing: [] };
      map[channel.id] = entry;
      return { channelId: channel.id, canPublish: entry.canPublish, missing: entry.missing };
    });
    await writeGuildEdition(guildId, edition, seeded, false);
  }

  return map;
};

export const PublishState = {
  writeGuildEdition,
  getEditionMap,
};
