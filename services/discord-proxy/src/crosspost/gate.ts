import type { CfBudget } from '../gateway/cfBudget.js';
import type { CantPostCache, SublimitCounter } from './caches.js';

export type GateRejectReason = 'cf_budget' | 'cant_post' | 'sublimit';

export type GateVerdict =
  | { kind: 'allow' }
  | { kind: 'reject'; reason: GateRejectReason };

export type Gate = {
  evaluate(channelId: string): Promise<GateVerdict>;
};

export const createGate = (deps: {
  cfBudget: CfBudget;
  cantPost: CantPostCache;
  sublimit: SublimitCounter;
}): Gate => ({
  evaluate: async (channelId) => {
    if (deps.cfBudget.isOverThreshold()) return { kind: 'reject', reason: 'cf_budget' };
    if (await deps.cantPost.isCantPost(channelId)) return { kind: 'reject', reason: 'cant_post' };
    if (await deps.sublimit.isOverLimit(channelId)) return { kind: 'reject', reason: 'sublimit' };
    return { kind: 'allow' };
  },
});
