import type { InvalidRequestsTracker } from '../gateway/invalidRequests.js';
import type { BlockedCache, SublimitCounter } from './caches.js';

export type GateRejectReason = 'invalid_requests' | 'blocked' | 'sublimit';

export type GateVerdict = { kind: 'allow' } | { kind: 'reject'; reason: GateRejectReason };

export type Gate = {
  evaluate(channelId: string): Promise<GateVerdict>;
};

export const createGate = (deps: {
  invalidRequests: InvalidRequestsTracker;
  blocked: BlockedCache;
  sublimit: SublimitCounter;
}): Gate => ({
  evaluate: async channelId => {
    if (deps.invalidRequests.isOverThreshold()) {
      return { kind: 'reject', reason: 'invalid_requests' };
    }
    if (await deps.blocked.isBlocked(channelId)) return { kind: 'reject', reason: 'blocked' };
    if (await deps.sublimit.isOverLimit(channelId)) return { kind: 'reject', reason: 'sublimit' };
    return { kind: 'allow' };
  },
});
