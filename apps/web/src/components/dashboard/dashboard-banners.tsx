'use client';

import { Check, Crown, ExternalLink, Hourglass, Megaphone, PauseCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useGuild } from '@/components/dashboard/guild-context';
import { LegacyMigrateModal } from '@/components/dashboard/legacy-migrate-modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { GuildChannel } from '@/lib/api/types';
import { getBotInviteUrl, PREMIUM_BOT_CLIENT_ID } from '@/lib/invite';
import { useRefreshOnReturn } from '@/lib/use-refresh-on-return';

// Same-tab listeners for the localStorage dismissal marker: the native `storage`
// event only fires in OTHER tabs, so dismiss() notifies these directly.
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

/**
 * Guild-level banner stack rendered in the dashboard shell, above the sidebar
 * and page content. Order: premium invite → premium pending → legacy
 * migration → paused channels. Invite and pending are mutually exclusive
 * (pending implies the premium bot is present); the migration banner can stack
 * with either. Banners 1–3 are not dismissible — they nag until the state
 * resolves (ADR 0006). The paused-channels banner is the lone dismissible
 * exception (ADR 0009). The checkout-success banner sits at the very top and is
 * query-param-scoped (`?success=true`, set only by the post-checkout redirect);
 * it carries no invite CTA — the premium-invite banner right below owns that.
 */
export function DashboardBanners() {
  const { guild, data } = useGuild();
  const searchParams = useSearchParams();

  const showCheckoutSuccess = searchParams.get('success') === 'true';
  const showPremiumInvite = guild.hasSubscription && !guild.premiumBotPresent;
  const showPremiumPending = data.premiumPending;
  const showMigration = !data.migrated;

  // Paused-channels state: free is the managing edition (channelLimit !== 0),
  // channels are paused, and the guild is not entitled — mutually exclusive
  // with the premium banners (which imply entitlement). ADR 0009.
  const pausedCount = data.channels.filter(c => c.hasSavedSetup).length;
  const overLimitPaused = data.channelLimit !== 0 && pausedCount > 0 && !guild.hasSubscription;

  // Episode-scoped, per-browser dismissal (no backend state for a cosmetic nag).
  const dismissKey = `ap:pausedBannerDismissed:${guild.id}`;
  const [pausedDismissed, dismissPaused] = usePersistentDismissal(dismissKey);

  // Clear the marker whenever the guild is back under limit so a fresh downgrade
  // re-alerts. Pure external write (no setState) — safe inside an effect.
  useEffect(() => {
    if (!overLimitPaused) window.localStorage.removeItem(dismissKey);
  }, [overLimitPaused, dismissKey]);

  const showPaused = overLimitPaused && !pausedDismissed;

  if (
    !showCheckoutSuccess &&
    !showPremiumInvite &&
    !showPremiumPending &&
    !showMigration &&
    !showPaused
  ) {
    return null;
  }

  return (
    <div className="space-y-6 mb-6">
      {showCheckoutSuccess && <CheckoutSuccessBanner />}
      {showPremiumInvite && <PremiumInviteBanner guildId={guild.id} />}
      {showPremiumPending && <PremiumPendingBanner guildId={guild.id} channels={data.channels} />}
      {showMigration && (
        <LegacyMigrationBanner
          guildId={guild.id}
          channels={data.channels}
          channelLimit={data.channelLimit}
          hasSubscription={guild.hasSubscription}
          premiumBotPresent={guild.premiumBotPresent}
          premiumPending={data.premiumPending}
        />
      )}
      {showPaused && (
        <PausedChannelsBanner
          guildId={guild.id}
          pausedCount={pausedCount}
          onDismiss={dismissPaused}
        />
      )}
    </div>
  );
}

/**
 * Post-checkout confirmation, shown at the top of the stack while `?success=true`
 * is on the URL. Deliberately minimal — no invite button: the premium-invite
 * banner right below owns the "invite the Premium bot" action, so a second CTA
 * here would be redundant.
 */
function CheckoutSuccessBanner() {
  return (
    <Card className="bg-green-500/10 border-green-500/30 p-6">
      <div className="flex items-start gap-4">
        <Check className="w-6 h-6 text-green-400 shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-white text-lg mb-1">Payment successful</h3>
          <p className="text-slate-300 text-sm">
            Your Premium subscription is being activated. This may take a few moments.
          </p>
        </div>
      </div>
    </Card>
  );
}

/**
 * Dismissible nag for a free guild sitting over the 3-channel limit with paused
 * (retained) channels. Yellow (warning family). ADR 0009.
 */
function PausedChannelsBanner({
  guildId,
  pausedCount,
  onDismiss,
}: {
  guildId: string;
  pausedCount: number;
  onDismiss: () => void;
}) {
  return (
    <Card className="bg-yellow-500/10 border-yellow-500/30 p-6 relative">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-4">
        <PauseCircle className="w-6 h-6 text-yellow-400 shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-white text-lg mb-1">
            {pausedCount} channel{pausedCount !== 1 ? 's are' : ' is'} paused
          </h3>
          <p className="text-slate-300 text-sm mb-4">
            This server is over the free limit of 3 channels. Their setup is saved and returns if
            you upgrade to Premium.
          </p>
          <div className="flex items-center gap-4">
            <Button className="bg-yellow-500 hover:bg-yellow-400 text-slate-950" asChild>
              <Link href={`/dashboard/${guildId}/subscription`}>Upgrade to Premium</Link>
            </Button>
            <Link
              href={`/dashboard/${guildId}/channels`}
              className="text-blue-400 hover:underline text-sm"
            >
              Manage channels
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Nag shown when the guild has an entitled subscription but the premium bot was never invited */
function PremiumInviteBanner({ guildId }: { guildId: string }) {
  const armRefreshOnReturn = useRefreshOnReturn();
  // Locked to the subscribed guild: the premium entitlement gate makes the
  // bot self-leave any other guild
  const inviteUrl = PREMIUM_BOT_CLIENT_ID
    ? getBotInviteUrl('premium', guildId, { lockGuildSelect: true })
    : null;

  return (
    <Card className="bg-purple-500/10 border-purple-500/30 p-6">
      <div className="flex items-start gap-4">
        <Crown className="w-6 h-6 text-purple-400 shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-white text-lg mb-1">
            Your Premium subscription isn&apos;t active on this server yet
          </h3>
          <p className="text-slate-300 text-sm mb-4">
            Invite the Premium bot to start using your subscription — your channels and settings are
            kept.
          </p>
          {inviteUrl && (
            <>
              <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white" asChild>
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={armRefreshOnReturn}
                >
                  Invite Premium Bot
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <p className="text-slate-500 text-sm mt-3">
                Bot permissions don&apos;t transfer between apps: the free bot keeps publishing
                until the Premium bot can publish in all your channels, then hands over and leaves
                automatically.
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Banner shown while the premium bot waits for permissions before taking over */
function PremiumPendingBanner({
  guildId,
  channels,
}: {
  guildId: string;
  channels: GuildChannel[];
}) {
  const blockedCount = channels.filter(c => c.premiumBotHasPermissions === false).length;

  return (
    <Card className="bg-purple-500/10 border-purple-500/30 p-6">
      <div className="flex items-start gap-4">
        <Hourglass className="w-6 h-6 text-purple-400 shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-white text-lg mb-1">Premium bot is waiting to take over</h3>
          <p className="text-slate-300 text-sm">
            The free bot keeps publishing until the Premium bot can publish in every configured
            channel — permissions don&apos;t transfer between bots.{' '}
            {blockedCount > 0 ? (
              <>
                Grant the Premium bot access to the {blockedCount} flagged channel
                {blockedCount !== 1 ? 's' : ''} in the{' '}
                <Link
                  href={`/dashboard/${guildId}/channels`}
                  className="text-blue-400 hover:underline"
                >
                  Channels tab
                </Link>{' '}
                to complete the switch.
              </>
            ) : (
              'The switch completes automatically within moments.'
            )}
          </p>
        </div>
      </div>
    </Card>
  );
}

// MIGRATION: Remove this banner after migration period (6 months)
function LegacyMigrationBanner({
  guildId,
  channels,
  channelLimit,
  hasSubscription,
  premiumBotPresent,
  premiumPending,
}: {
  guildId: string;
  channels: GuildChannel[];
  channelLimit: number;
  hasSubscription: boolean;
  premiumBotPresent: boolean;
  premiumPending: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Card className="bg-amber-500/10 border-amber-500/30 p-6">
        <div className="flex items-start gap-4">
          <Megaphone className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-white text-lg mb-1">This server runs in legacy mode</h3>
            <p className="text-slate-300 text-sm mb-4">
              Every announcement channel is published automatically. Legacy mode will be
              discontinued in the near future, and the bot may stop publishing in this server once
              it is retired. Migrate now to keep publishing without interruption, choose exactly
              which channels publish, and unlock new features.
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950"
            >
              Migrate now
            </Button>
          </div>
        </div>
      </Card>
      {modalOpen && (
        <LegacyMigrateModal
          guildId={guildId}
          channels={channels}
          limit={channelLimit === 0 ? null : channelLimit}
          hasSubscription={hasSubscription}
          premiumBotPresent={premiumBotPresent}
          premiumPending={premiumPending}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
