'use client';

import { Clock } from 'lucide-react';
import { useIsPublicInstance } from '@/components/site-config-context';

/**
 * Copy explaining that publishing may be delayed. Free callers get the
 * reassurance ("every message will be published") plus a soft Premium upsell;
 * entitled callers get the minimal-delay message.
 *
 * Keyed on `hasSubscription`, not live premium-bot presence: an entitled guild
 * whose Premium bot hasn't taken over yet is still served by the free bot and
 * so still sees free-bot delays. Keeping this simple is deliberate — the
 * pending-handover window is transient.
 */
export function publishDelayCopy(hasSubscription: boolean): string {
  return hasSubscription
    ? 'Messages are published almost instantly — Premium runs on dedicated capacity, so delays stay rare even at peak times.'
    : "Messages may be delayed during busy periods to respect Discord's rate limits — but every message will be published. Upgrade to Premium for faster publishing.";
}

/**
 * Which copy this deployment shows. A self-hosted instance has no billing and
 * no shared free-tier queue to be throttled behind, so it always reads as
 * entitled — otherwise the note would upsell a plan that doesn't exist.
 */
export function usePublishDelayEntitled(hasSubscription: boolean): boolean {
  const isPublicInstance = useIsPublicInstance();
  return hasSubscription || !isPublicInstance;
}

/**
 * Ambient delay note. Mirrors PublishLimitNote's markup so the two read as a
 * pair on the Channels tab and Overview.
 */
export function PublishDelayNote({ hasSubscription }: { hasSubscription: boolean }) {
  const entitled = usePublishDelayEntitled(hasSubscription);
  return (
    <p className="flex items-center gap-2 text-slate-500 text-sm">
      <Clock className="w-4 h-4 shrink-0" />
      {publishDelayCopy(entitled)}
    </p>
  );
}
