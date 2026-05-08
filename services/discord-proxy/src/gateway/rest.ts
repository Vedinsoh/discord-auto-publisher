import { type RateLimitData, REST, RESTEvents } from '@discordjs/rest';
import { logger } from '../logger.js';

const SUBLIMIT_TIME_THRESHOLD_MS = 60_000;

/**
 * Reject sublimits so our error handlers see them. Route-level 429s (timeToReset < ~10s) are still
 * waited out by discord.js. Pre-flight passes sublimitTimeout=0, so we use timeToReset as a proxy.
 */
const rejectOnCrosspostRateLimit = (data: RateLimitData): boolean => {
  const isPostSublimit = data.scope === 'shared' && data.sublimitTimeout > 0;
  const isPreflightSublimit = data.timeToReset > SUBLIMIT_TIME_THRESHOLD_MS;
  return isPostSublimit || isPreflightSublimit;
};

export const createRest = (token: string): REST => {
  const rest = new REST({
    rejectOnRateLimit: rejectOnCrosspostRateLimit,
    retries: 0,
    invalidRequestWarningInterval: 1,
  }).setToken(token);

  rest.on(RESTEvents.RateLimited, (data) => {
    logger.warn({ event: 'rest.rate_limited', ...data }, 'Rate limit hit');
  });

  return rest;
};
