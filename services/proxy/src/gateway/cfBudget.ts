import { type InvalidRequestWarningData, REST, RESTEvents } from '@discordjs/rest';
import { logger } from '../logger.js';

const WINDOW_MS = 10 * 60 * 1_000;

export type CfBudget = {
  isOverThreshold(): boolean;
  current(): { count: number; expiresInMs: number };
};

export const createCfBudget = (rest: REST, threshold: number): CfBudget => {
  let count = 0;
  let expiresAt = 0;

  rest.on(RESTEvents.InvalidRequestWarning, (data: InvalidRequestWarningData) => {
    count = data.count;
    expiresAt = Date.now() + data.remainingTime;
    logger.info({ event: 'cf_budget.update', count, remainingMs: data.remainingTime });
  });

  const isWindowExpired = () => Date.now() >= expiresAt;

  return {
    isOverThreshold: () => {
      if (isWindowExpired()) return false;
      return count >= threshold;
    },
    current: () => {
      if (isWindowExpired()) return { count: 0, expiresInMs: 0 };
      return { count, expiresInMs: Math.max(0, expiresAt - Date.now()) };
    },
  };
};

export const DEFAULT_CF_BUDGET_WINDOW_MS = WINDOW_MS;
