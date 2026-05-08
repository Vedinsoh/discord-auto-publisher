import type { CfBudget } from '../gateway/cfBudget.js';
import type { BlockedCache, SublimitCounter } from './caches.js';

export type GateRejectReason = 'cf_budget' | 'blocked' | 'sublimit';

export type GateVerdict =
  | { kind: 'allow' }
  | { kind: 'reject'; reason: GateRejectReason };

export type Gate = {
  evaluate(channelId: string): Promise<GateVerdict>;
};

export const createGate = (deps: {
  cfBudget: CfBudget;
  blocked: BlockedCache;
  sublimit: SublimitCounter;
}): Gate => ({
  evaluate: async (channelId) => {
    if (deps.cfBudget.isOverThreshold()) return { kind: 'reject', reason: 'cf_budget' };
    if (await deps.blocked.isBlocked(channelId)) return { kind: 'reject', reason: 'blocked' };
    if (await deps.sublimit.isOverLimit(channelId)) return { kind: 'reject', reason: 'sublimit' };
    return { kind: 'allow' };
  },
});
