'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useGuild } from '@/components/dashboard/guild-context';

// Same-tab listeners for the localStorage dismissal marker: the native `storage`
// event only fires in OTHER tabs, so dismiss() notifies these directly. Shared at
// module scope so every hook instance (banner stack + sidebar badge) stays in sync.
const dismissalListeners = new Set<() => void>();

/**
 * Reads a per-browser dismissal marker from localStorage via useSyncExternalStore
 * — SSR-safe (server snapshot = dismissed/hidden, so no hydration flash or
 * mismatch) and without a synchronous setState inside an effect (React flags that
 * as cascading renders).
 */
function usePersistentDismissal(key: string): [boolean, () => void] {
  const subscribe = useCallback((onStoreChange: () => void) => {
    dismissalListeners.add(onStoreChange);
    window.addEventListener('storage', onStoreChange);
    return () => {
      dismissalListeners.delete(onStoreChange);
      window.removeEventListener('storage', onStoreChange);
    };
  }, []);
  const dismissed = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key) === '1',
    () => true
  );
  const dismiss = useCallback(() => {
    window.localStorage.setItem(key, '1');
    for (const listener of dismissalListeners) listener();
  }, [key]);
  return [dismissed, dismiss];
}

export interface GuildAttention {
  /** `hasSubscription && !premiumBotPresent` — entitled but premium bot never invited */
  showPremiumInvite: boolean;
  /** Premium handover pending (both bots present, free still managing) */
  showPremiumPending: boolean;
  /** MIGRATION: legacy guild (auto-publishes everything). Removed at sunset. */
  showMigration: boolean;
  /** Over the free limit with retained (paused) channels AND not dismissed */
  showPaused: boolean;
  /** Count of paused (retained) channels — drives the paused banner copy */
  pausedCount: number;
  /** Enabled channels the managing bot currently can't publish in (migrated only) */
  needsFixingCount: number;
  /**
   * Distinct attention items for the Overview sidebar badge: each active nag
   * banner counts 1, plus 1 when any channel needs permission fixing. The
   * positive checkout-success card and premium-handover access gaps never count.
   */
  badgeCount: number;
  /** Dismiss the paused-channels banner (episode-scoped, per-browser). */
  dismissPaused: () => void;
}

/**
 * Single source of truth for the guild's attention state, consumed by both the
 * Overview banner stack (what to render) and the sidebar badge (how many items).
 * Must be called within a GuildProvider.
 */
export function useGuildAttention(): GuildAttention {
  const { guild, data } = useGuild();

  const showPremiumInvite = guild.hasSubscription && !guild.premiumBotPresent;
  const showPremiumPending = data.premiumPending;
  const showMigration = !data.migrated;

  // Paused-channels state: free is the managing edition (channelLimit !== 0),
  // channels are paused, and the guild is not entitled — mutually exclusive with
  // the premium banners (which imply entitlement). ADR 0009.
  const pausedCount = data.channels.filter(c => c.hasSavedSetup).length;
  const overLimitPaused = data.channelLimit !== 0 && pausedCount > 0 && !guild.hasSubscription;

  const dismissKey = `ap:pausedBannerDismissed:${guild.id}`;
  const [pausedDismissed, dismissPaused] = usePersistentDismissal(dismissKey);

  // Clear the marker whenever the guild is back under limit so a fresh downgrade
  // re-alerts. Pure external write (no setState) — safe inside an effect.
  useEffect(() => {
    if (!overLimitPaused) window.localStorage.removeItem(dismissKey);
  }, [overLimitPaused, dismissKey]);

  const showPaused = overLimitPaused && !pausedDismissed;

  // Legacy guilds contribute no per-channel permission item — migration comes
  // first (the itemized status list is a migrated-guild concept).
  const needsFixingCount = data.migrated
    ? data.channels.filter(c => c.enabled && c.canPublish === false).length
    : 0;

  const badgeCount =
    (showPremiumInvite ? 1 : 0) +
    (showPremiumPending ? 1 : 0) +
    (showMigration ? 1 : 0) +
    (showPaused ? 1 : 0) +
    (needsFixingCount > 0 ? 1 : 0);

  return {
    showPremiumInvite,
    showPremiumPending,
    showMigration,
    showPaused,
    pausedCount,
    needsFixingCount,
    badgeCount,
    dismissPaused,
  };
}
