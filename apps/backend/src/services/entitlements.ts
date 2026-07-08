import type { Subscription } from '@ap/database';
import { Discord } from './discord.js';
import { Editions } from './editions.js';
import { isEntitledStatus } from './subscriptions.js';

/**
 * Makes the premium bot leave a guild that lost its entitlement — but only when
 * the premium bot is actually present. A subscribed-but-uninvited or
 * already-departed guild is a no-op with zero Discord traffic: `DELETE
 * /users/@me/guilds/:id` is rate-limited 1/window (`scope: user`, non-shared),
 * so a pointless leave collides on that bucket and its 429 counts toward the
 * Cloudflare invalid-request budget. A stale-absent presence row (bot present,
 * row says left) is backstopped by the nightly guild reconcile restoring
 * presence, then the subscription reconcile re-revoking.
 */
const revokePremiumAccess = async (guildId: string): Promise<void> => {
  if (!(await Editions.isBotPresent(guildId, 'premium'))) return;
  await Discord.leaveGuild('premium', guildId);
};

/**
 * Detects an entitled → not-entitled transition and enforces it.
 */
const enforceTransition = async (
  previous: Subscription | undefined,
  current: Subscription | undefined
): Promise<void> => {
  if (!current) return;
  const wasEntitled = previous ? isEntitledStatus(previous.status) : false;
  const isNowEntitled = isEntitledStatus(current.status);

  if (wasEntitled && !isNowEntitled) {
    await revokePremiumAccess(current.guildId);
  }
};

export const Entitlements = {
  revokePremiumAccess,
  enforceTransition,
};
