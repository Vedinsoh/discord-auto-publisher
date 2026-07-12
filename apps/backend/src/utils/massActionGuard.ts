import { alerter } from 'utils/alerts.js';
import { logger } from 'utils/logger.js';

const CAP_FLOOR = 50;
const CAP_RATIO = 0.1;

/**
 * Circuit-breaker cap for destructive batch operations (bot leaves, presence
 * soft-deletes): the larger of a fixed floor and 10% of the affected
 * population. Keeps a bad upstream snapshot — a truncated Discord guild list, a
 * Paddle mass-cancel incident — from cascading into a mass bot-leave.
 */
export const massActionCap = (population: number): number =>
  Math.max(CAP_FLOOR, Math.ceil(population * CAP_RATIO));

/**
 * Guards a destructive batch against the {@link massActionCap}. Returns true
 * when the batch is within bounds; when it exceeds the cap it logs, fires a
 * throttled alert (stable `key` for grep + throttle continuity), and returns
 * false so the caller aborts the WHOLE batch. A tripped guard almost always
 * means bad upstream data, not a legitimate mass change — worth a human look
 * before the next run.
 */
export const guardMassAction = (options: {
  key: string;
  action: string;
  count: number;
  population: number;
  context: string;
}): boolean => {
  const { key, action, count, population, context } = options;
  const cap = massActionCap(population);
  if (count <= cap) return true;

  const detail = `Refused to ${action}: ${count} exceeds cap ${cap} (population ${population}). ${context}`;
  logger.error(`Mass-action guard tripped [${key}]: ${detail}`);
  alerter.send(key, { title: 'Mass-action guard tripped', description: detail });
  return false;
};
