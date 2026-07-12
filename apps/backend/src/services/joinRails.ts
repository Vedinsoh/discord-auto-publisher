import type { Snowflake } from 'discord-api-types/globals';
import { logger } from 'utils/logger.js';
import { Discord } from './discord.js';
import { Editions } from './editions.js';
import { Handover } from './handover.js';
import { isEntitledStatus, Subscriptions } from './subscriptions.js';

/**
 * Join-decision rails for guilds whose register call the backend never saw
 * (missed guildCreate) — the same orchestration `registerNewGuild` runs, but
 * evaluated on reconciled presence rows. Shared by the nightly reconcile sweep
 * and the dashboard presence self-heal:
 * - premium present with an existing not-entitled subscription → leave via
 *   premium proxy. A MISSING subscription row is deliberately not grounds to
 *   leave here: after a DB reset this runs before the subscription reconcile
 *   has repopulated rows from Paddle, and kicking every premium guild would be
 *   catastrophic — the 04:00 revocation backstop owns that.
 * - both bots present without a marker → set the handover marker (premium
 *   idles; its stale in-memory latch, if any, resets on evaluate-swap or bot
 *   restart) and evaluate when entitlement is confirmed.
 * - free present while premium manages → leave via free proxy.
 */
export const applyJoinRails = async (guildIds: Set<Snowflake>): Promise<void> => {
  for (const guildId of guildIds) {
    try {
      const active = await Editions.getActiveEditions(guildId);

      if (active.has('premium')) {
        // getByGuildId throws on DB errors — never treat an error as "not entitled"
        const sub = await Subscriptions.getByGuildId(guildId);

        if (sub && !isEntitledStatus(sub.status)) {
          logger.info(`Join rails: premium bot leaving guild ${guildId} (not entitled)`);
          await Discord.leaveGuild('premium', guildId);
          continue;
        }

        if (active.has('free')) {
          if (!(await Handover.isPending(guildId))) {
            logger.info(`Join rails: restoring handover marker for guild ${guildId}`);
            await Handover.setPending(guildId);
          }
          if (sub) {
            await Handover.evaluate(guildId);
          }
          continue;
        }
      }

      if (
        active.has('free') &&
        (await Editions.getManagingEdition(guildId)) === 'premium' &&
        // Belt and braces on top of the reconciled rows: never evict the free
        // bot unless the premium bot's membership is confirmed live
        (await Discord.isBotInGuild('premium', guildId))
      ) {
        logger.info(`Join rails: free bot leaving guild ${guildId} (premium is managing)`);
        await Discord.leaveGuild('free', guildId);
      }

      // Enforce the channel-serving invariant once the managing edition has
      // settled (ADR 0008): a no-op unless free manages over the cap (pause
      // excess) or premium manages with paused rows (reactivate). A free bot
      // that just left above still reads as managing==premium here → no trim.
      await Editions.reconcileChannelServing(guildId);
    } catch (error) {
      logger.warn(error, `Join rails: check failed for guild ${guildId}`);
    }
  }
};
