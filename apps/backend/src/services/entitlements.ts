import type { Subscription } from '@ap/database';
import { Discord } from './discord.js';
import { isEntitledStatus } from './subscriptions.js';

/**
 * Makes the premium bot leave a guild that lost its entitlement.
 * Idempotent: bot may already be gone (kick, guild deleted).
 */
const revokePremiumAccess = async (guildId: string): Promise<void> => {
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
