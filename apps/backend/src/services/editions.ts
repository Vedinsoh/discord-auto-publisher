import type { Edition } from '@ap/api-types';
import { botPresence, db } from '@ap/database';
import type { Snowflake } from 'discord-api-types/globals';
import { and, eq, isNull } from 'drizzle-orm';
import { Handover } from './handover.js';

const FREE_CHANNEL_LIMIT = 3;

/** Editions whose bot is currently in the guild (`leftAt IS NULL`) */
const getActiveEditions = async (guildId: Snowflake): Promise<Set<Edition>> => {
  const rows = await db
    .select({ edition: botPresence.edition })
    .from(botPresence)
    .where(and(eq(botPresence.guildId, guildId), isNull(botPresence.leftAt)));
  return new Set(rows.map(r => r.edition));
};

const isPresenceActive = async (guildId: Snowflake, edition: Edition): Promise<boolean> =>
  (await getActiveEditions(guildId)).has(edition);

/**
 * The edition doing the work in a guild: premium once the handover swapped (or
 * the premium bot is the sole member), free otherwise — including while the
 * handover is pending. Guilds with no bot resolve to free (legacy defaults).
 */
const getManagingEdition = async (guildId: Snowflake): Promise<Edition> => {
  const active = await getActiveEditions(guildId);
  if (!active.has('premium')) return 'free';
  if (!active.has('free')) return 'premium';
  return (await Handover.isPending(guildId)) ? 'free' : 'premium';
};

/** Max enabled channels for an edition; 0 = unlimited */
const channelLimitFor = (edition: Edition): number =>
  edition === 'premium' ? 0 : FREE_CHANNEL_LIMIT;

/** Max enabled channels for a guild by its managing edition; 0 = unlimited */
const getChannelLimit = async (guildId: Snowflake): Promise<number> =>
  channelLimitFor(await getManagingEdition(guildId));

export const Editions = {
  getActiveEditions,
  isPresenceActive,
  getManagingEdition,
  channelLimitFor,
  getChannelLimit,
};
