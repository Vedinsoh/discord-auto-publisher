'use client';

import { useEffect, useState } from 'react';
import { getSubscription } from '@/lib/api/actions';
import type { SubscriptionDetail } from '@/lib/api/types';

/**
 * Portal URLs, co-admin username, withdrawal state.
 *
 * Its own fetch, never a slice of `useGuild()`: `GET /api/guild/:guildId` throws
 * `409 BOT_NOT_PRESENT` for a botless guild, which is where every withdrawal lands and
 * where a day-3 canceller still has 11 days of window (ZZP čl. 81.a st. 2). The
 * subscription endpoint has no presence check.
 */
export function useSubscriptionDetail(guildId: string, enabled: boolean) {
  const [detail, setDetail] = useState<SubscriptionDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getSubscription(guildId)
      .then(result => {
        if (!cancelled) setDetail(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [guildId, enabled]);

  return { detail, failed };
}
