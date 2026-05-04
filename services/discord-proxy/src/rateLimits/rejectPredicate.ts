import type { RateLimitData } from '@discordjs/rest';

const SUBLIMIT_TIME_THRESHOLD_MS = 60_000;

/**
 * Reject only crosspost sublimits — route-level limits are auto-handled by discord.js.
 * Post-429: scope='shared' && sublimitTimeout>0
 * Pre-flight: discord.js hardcodes sublimitTimeout=0 and scope='user' in the while(limited) loop,
 *   so we use timeToReset as a proxy. Sublimits reset in minutes-to-hours, route-level in <10s.
 */
export const rejectOnCrosspostRateLimit = (data: RateLimitData): boolean => {
  const isPostSublimit = data.scope === 'shared' && data.sublimitTimeout > 0;
  const isPreflightSublimit = data.timeToReset > SUBLIMIT_TIME_THRESHOLD_MS;
  return isPostSublimit || isPreflightSublimit;
};
