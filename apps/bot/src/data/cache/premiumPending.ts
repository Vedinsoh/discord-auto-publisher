import { Keys } from '@ap/redis';
import type { Snowflake } from 'discord.js';
import { Redis } from './redis.js';

const _key = (guildId: Snowflake) => `${Keys.PremiumPending}:${guildId}`;

/**
 * Whether a premium handover is pending for the guild. Throws on Redis errors
 * (and on the free bot, which has no client) — the caller decides the
 * fail-open behavior; a silent false would falsely latch "active".
 */
const isPending = async (guildId: Snowflake): Promise<boolean> => {
  if (!Redis.PremiumPending) throw new Error('PremiumPending cache is premium-only');
  return (await Redis.PremiumPending.exists(_key(guildId))) === 1;
};

export const PremiumPending = { isPending };
