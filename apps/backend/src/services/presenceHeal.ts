import type { Edition } from '@ap/api-types';
import { db, guild } from '@ap/database';
import { createTtlCache } from '@ap/utils';
import type { Snowflake } from 'discord-api-types/globals';
import { logger } from 'utils/logger.js';
import { Discord } from './discord.js';
import { Guilds } from './guilds.js';
import { applyJoinRails } from './joinRails.js';

const CONFIRMED_ABSENT_TTL_MS = 30_000;

// Negative cache: guild+edition pairs recently confirmed absent at Discord.
// In-memory is safe — the backend is single-instance (ADR 0006) — and the TTL
// is short so an invite-return refresh is never stuck behind a stale entry.
const confirmedAbsent = createTtlCache<true>(CONFIRMED_ABSENT_TTL_MS);

/**
 * Dashboard-read self-heal for presence rows the event path can never repair:
 * re-authorizing a bot that is already a member fires NO gateway event, and a
 * join missed while the stack was down (or a row lost to a DB reset) is never
 * re-emitted by Discord — without this, the dashboard shows "not present"
 * until the nightly reconcile while the bot sits in the guild working.
 *
 * For each edition the DB says is absent: live-check membership through the
 * proxy and, when the bot IS there, restore the row with the reconcile sweep's
 * semantics — unknown guilds inserted as legacy, then the shared join rails
 * (which, unlike registerNewGuild's join-time gate, never make the premium bot
 * leave on a MISSING subscription row). Confirmed-absent results are cached
 * for 30s so refresh-hammering a dashboard full of botless guilds does not
 * multiply member-fetch calls.
 *
 * @param guildId ID of the guild
 * @param absentEditions editions with no active presence row
 * @returns editions whose presence was restored
 */
const healAbsentEditions = async (
  guildId: Snowflake,
  absentEditions: Edition[]
): Promise<Set<Edition>> => {
  const healed = new Set<Edition>();

  for (const edition of absentEditions) {
    if (!Discord.hasToken(edition)) continue;

    const cacheKey = `${guildId}:${edition}`;
    if (confirmedAbsent.get(cacheKey)) continue;

    try {
      if (!(await Discord.isBotInGuild(edition, guildId))) {
        confirmedAbsent.set(cacheKey, true);
        continue;
      }

      // Same shape as the reconcile sweep insert: a guild running without a
      // row has been behaving legacy since the missed event.
      // MIGRATION: no change at sunset (already a plain guild-exists insert).
      await db.insert(guild).values({ guildId }).onConflictDoNothing();
      await Guilds.activatePresence(guildId, edition);
      confirmedAbsent.delete(cacheKey);
      healed.add(edition);
      logger.info(`Presence heal: restored ${edition} presence for guild ${guildId}`);
    } catch (error) {
      logger.warn(error, `Presence heal failed for guild ${guildId} (${edition})`);
    }
  }

  if (healed.size > 0) {
    await applyJoinRails(new Set([guildId]));
  }

  return healed;
};

export const PresenceHeal = { healAbsentEditions };
