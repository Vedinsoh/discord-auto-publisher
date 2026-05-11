import { Keys } from '@ap/redis';
import type { Snowflake } from 'discord.js';
import { Redis } from './redis.js';

const client = Redis.MigratedGuilds;

const _key = (guildId: Snowflake) => `${Keys.MigratedGuild}:${guildId}`;

const isMigrated = async (guildId: Snowflake): Promise<boolean> => {
  try {
    return (await client.exists(_key(guildId))) === 1;
  } catch {
    return false;
  }
};

export const MigratedGuilds = { isMigrated };
