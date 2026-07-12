import type { ChannelLimitReason, Edition } from '@ap/api-types';
import { botPresence, db } from '@ap/database';
import type { Snowflake } from 'discord-api-types/globals';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { Handover } from './handover.js';
import { isEntitledStatus, Subscriptions } from './subscriptions.js';

const FREE_CHANNEL_LIMIT = 3;

/** Editions whose bot is currently in the guild (`leftAt IS NULL`) */
const getActiveEditions = async (guildId: Snowflake): Promise<Set<Edition>> => {
  const rows = await db
    .select({ edition: botPresence.edition })
    .from(botPresence)
    .where(and(eq(botPresence.guildId, guildId), isNull(botPresence.leftAt)));
  return new Set(rows.map(r => r.edition));
};

const isBotPresent = async (guildId: Snowflake, edition: Edition): Promise<boolean> =>
  (await getActiveEditions(guildId)).has(edition);

/** How many guilds an edition's bot is currently in (`leftAt IS NULL`) */
const countPresent = async (edition: Edition): Promise<number> => {
  const [row] = await db
    .select({ value: count() })
    .from(botPresence)
    .where(and(eq(botPresence.edition, edition), isNull(botPresence.leftAt)));
  return row?.value ?? 0;
};

/** Subset of `guildIds` an edition's bot is currently in (`leftAt IS NULL`) */
const filterPresent = async (guildIds: Snowflake[], edition: Edition): Promise<Snowflake[]> => {
  if (guildIds.length === 0) return [];
  const rows = await db
    .select({ guildId: botPresence.guildId })
    .from(botPresence)
    .where(
      and(
        inArray(botPresence.guildId, guildIds),
        eq(botPresence.edition, edition),
        isNull(botPresence.leftAt)
      )
    );
  return rows.map(r => r.guildId);
};

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

/**
 * Resolves a guild's channel cap plus the reason to surface if it's hit.
 * The cap is keyed on the managing edition (the bot actually publishing) — the
 * free bot never serves more than {@link FREE_CHANNEL_LIMIT} channels, even for
 * an entitled guild whose premium bot hasn't taken over yet. `reason` is only
 * meaningful when `limit !== 0` and directs the user to the right resolution:
 * buy Premium (`LIMIT_FREE`), invite the premium bot (`LIMIT_PREMIUM_INVITE`),
 * or grant it permissions to finish the handover (`LIMIT_PREMIUM_PENDING`).
 */
const resolveChannelLimit = async (
  guildId: Snowflake
): Promise<{ limit: number; reason: ChannelLimitReason }> => {
  const active = await getActiveEditions(guildId);
  const premiumActive = active.has('premium');
  const freeActive = active.has('free');
  const pending = premiumActive && freeActive ? await Handover.isPending(guildId) : false;
  const managing: Edition = !premiumActive
    ? 'free'
    : !freeActive
      ? 'premium'
      : pending
        ? 'free'
        : 'premium';

  const limit = channelLimitFor(managing);
  if (limit === 0) return { limit, reason: 'LIMIT_FREE' };

  // Capped (free is serving). Distinguish an entitled guild waiting on its
  // premium bot from a genuinely free guild.
  const sub = await Subscriptions.getByGuildId(guildId);
  const entitled = sub ? isEntitledStatus(sub.status) : false;
  const reason: ChannelLimitReason = !entitled
    ? 'LIMIT_FREE'
    : premiumActive
      ? 'LIMIT_PREMIUM_PENDING'
      : 'LIMIT_PREMIUM_INVITE';
  return { limit, reason };
};

export const Editions = {
  getActiveEditions,
  isBotPresent,
  countPresent,
  filterPresent,
  getManagingEdition,
  channelLimitFor,
  resolveChannelLimit,
};
