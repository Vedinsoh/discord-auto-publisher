'use client';

import {
  Check,
  Clock,
  Crown,
  ExternalLink,
  Hourglass,
  Loader2,
  Megaphone,
  PauseCircle,
  RefreshCw,
  TriangleAlert,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useGuild } from '@/components/dashboard/guild-context';
import { LegacyMigrateModal } from '@/components/dashboard/legacy-migrate-modal';
import { useGuildAttention } from '@/components/dashboard/use-guild-attention';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { GuildChannel } from '@/lib/api/types';
import { legacySunsetLabel, links } from '@/lib/constants';
import { getBotInviteUrl, PREMIUM_BOT_CLIENT_ID } from '@/lib/invite';
import { FREE_CHANNEL_LIMIT } from '@/lib/plans';
import { useActivationPoll } from '@/lib/use-activation-poll';
import { useRefreshOnReturn } from '@/lib/use-refresh-on-return';

/**
 * Guild-level banner stack, rendered inside the Overview tab (moved off the
 * dashboard shell — see ADR 0006 / CONTEXT "Overview banner stack"). Order:
 * checkout activation → misconfigured channels → premium invite → premium pending →
 * legacy migration → paused channels. Misconfigured (red) is the only current
 * outage, so it leads the warnings. Invite and pending are mutually exclusive
 * (pending implies the premium bot is present); the migration banner can stack
 * with either. Banners 1–4 are not dismissible — they nag until the state resolves. The
 * paused-channels banner is the lone dismissible exception (ADR 0009). The
 * checkout-activation banner sits at the very top and is query-param-scoped
 * (`?success=true`, set only by the post-checkout redirect to this tab); it is
 * self-resolving — it polls for the webhook-written subscription and hands off
 * to the premium-invite banner right below once active (see
 * `CheckoutActivationBanner`), so it never dead-ends on "activating…". Off this
 * tab, the sidebar's Overview attention badge is the only persistent signal,
 * kept in sync via the shared `useGuildAttention` hook.
 */
export function DashboardBanners() {
  const { guild, data } = useGuild();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const {
    showMisconfigured,
    needsFixingCount,
    showPremiumInvite,
    showPremiumPending,
    showMigration,
    showPaused,
    pausedCount,
    dismissPaused,
  } = useGuildAttention();

  // Checkout-activation card: query-param-armed, but its variant is driven by
  // real subscription state, not the param. `active` = the webhook has written
  // an entitled subscription row (guild.hasSubscription, live from Postgres).
  const isCheckoutReturn = searchParams.get('success') === 'true';
  const active = guild.hasSubscription;
  const phase = useActivationPoll(isCheckoutReturn && !active, active);

  // Once active, hand off to the real-state banners below: strip `?success=true`
  // so a later manual refresh doesn't re-surface anything. Kept only for the
  // rare "active but neither invite nor pending applies" confirmation (Card 2).
  const willHandOff = isCheckoutReturn && active && (showPremiumInvite || showPremiumPending);
  useEffect(() => {
    if (willHandOff) router.replace(pathname, { scroll: false });
  }, [willHandOff, pathname, router]);

  const showActivating = isCheckoutReturn && !active; // Card 1 (activating) / Card 3 (gaveUp)
  const showActivatedConfirm =
    isCheckoutReturn && active && !showPremiumInvite && !showPremiumPending; // Card 2
  const showCheckoutCard = showActivating || showActivatedConfirm;

  if (
    !showCheckoutCard &&
    !showMisconfigured &&
    !showPremiumInvite &&
    !showPremiumPending &&
    !showMigration &&
    !showPaused
  ) {
    return null;
  }

  return (
    <div className="space-y-6">
      {showCheckoutCard && (
        <CheckoutActivationBanner variant={showActivatedConfirm ? 'confirmed' : phase} />
      )}
      {showMisconfigured && <MisconfiguredChannelsBanner count={needsFixingCount} />}
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
 * Post-checkout activation card, top of the stack while `?success=true` is on
 * the URL. Three variants (see `DashboardBanners`):
 *   - `activating`: the poller (`useActivationPoll`) is soft-refreshing every 3s
 *     waiting for the webhook to write the subscription row. No CTA — the
 *     premium-invite banner it hands off to owns the "invite the bot" action.
 *   - `gaveUp`: the 60s ceiling passed with no activation → calm manual-refresh
 *     fallback (amber, not red — payment succeeded, nothing is broken).
 *   - `confirmed`: activated but neither invite nor pending applies (rare
 *     re-subscribe with the premium bot already present + healthy) → a one-time
 *     positive confirmation so the flow never ends on a silent empty state.
 */
function CheckoutActivationBanner({ variant }: { variant: 'activating' | 'gaveUp' | 'confirmed' }) {
  if (variant === 'gaveUp') {
    return <CheckoutActivationFallback />;
  }

  if (variant === 'confirmed') {
    return (
      <Card className="bg-green-500/10 border-green-500/30 p-6">
        <div className="flex items-start gap-4">
          <Check className="w-6 h-6 text-green-400 shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-white text-lg mb-1">Premium is now active</h3>
            <p className="text-slate-300 text-sm">
              Your subscription is active and everything&apos;s already set up for this server.
              Thanks for upgrading!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-blue-500/10 border-blue-500/30 p-6">
      <div className="flex items-start gap-4">
        <Loader2 className="w-6 h-6 text-blue-400 shrink-0 mt-1 animate-spin" />
        <div className="flex-1">
          <h3 className="text-white text-lg mb-1">Payment received — activating Premium</h3>
          <p className="text-slate-300 text-sm">
            We&apos;re setting up your Premium subscription. This usually takes a few seconds — the
            page will update automatically.
          </p>
        </div>
      </div>
    </Card>
  );
}

/**
 * Shown once activation exceeds the 60s poll ceiling. Amber (not red): the
 * payment went through, so this is a "hang tight" state, not an outage. The
 * Refresh button is a single soft `router.refresh()` — the poller has stopped.
 */
function CheckoutActivationFallback() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="bg-amber-500/10 border-amber-500/30 p-6">
      <div className="flex items-start gap-4">
        <Clock className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-white text-lg mb-1">Still activating your Premium</h3>
          <p className="text-slate-300 text-sm mb-4">
            Your payment went through, but activation is taking longer than usual — it can
            occasionally take a few minutes. Try refreshing below, and if Premium still doesn&apos;t
            appear, reach out and we&apos;ll sort it out right away.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button
              className="bg-amber-500 hover:bg-amber-400 text-slate-950"
              onClick={() => startTransition(() => router.refresh())}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
            <p className="text-slate-400 text-sm">
              Email{' '}
              <a href={`mailto:${links.supportEmail}`} className="text-blue-400 hover:underline">
                {links.supportEmail}
              </a>{' '}
              &middot;{' '}
              <a
                href={links.discordSupportServer}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Join our support server
              </a>
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Nag for a migrated guild with ≥1 enabled channel the managing bot can't publish
 * in (`canPublish === false`). Red — the only current outage in the stack, so it
 * leads the warnings. Any number of broken channels collapse into this one banner;
 * the per-channel detail + Fix affordance lives in the channel list below on the
 * same tab. Not dismissible — it clears when permissions are restored.
 */
function MisconfiguredChannelsBanner({ count }: { count: number }) {
  return (
    <Card className="bg-red-500/10 border-red-500/30 p-6">
      <div className="flex items-start gap-4">
        <TriangleAlert className="w-6 h-6 text-red-400 shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-white text-lg mb-1">
            {count === 1 ? "A channel isn't publishing" : "Some channels aren't publishing"}
          </h3>
          <p className="text-slate-300 text-sm">
            {count === 1 ? 'One of your enabled channels is' : 'One or more enabled channels are'}{' '}
            missing the permissions the bot needs. See the channel list below to fix{' '}
            {count === 1 ? 'it' : 'them'}.
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
            This server is over the free limit of {FREE_CHANNEL_LIMIT} channels. Their setup is
            saved and returns if you upgrade to Premium.
          </p>
          <div className="flex items-center gap-4">
            {/* Names the destination, not the outcome: the Subscription page
                still asks for a deliberate upgrade press. */}
            <Button className="bg-yellow-500 hover:bg-yellow-400 text-slate-950" asChild>
              <Link href={`/dashboard/${guildId}/subscription`}>See Premium plans</Link>
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
            Premium is active — invite the Premium bot to switch over
          </h3>
          <p className="text-slate-300 text-sm mb-4">
            Your subscription is active. Invite the Premium bot to this server to start using it —
            your channels and settings are kept.
          </p>
          {inviteUrl && (
            <>
              <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white" asChild>
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => armRefreshOnReturn()}
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
            Your subscription is active. The free bot keeps publishing until your Premium bot has
            permission in every channel — permissions don&apos;t carry over between bots.{' '}
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
            <p className="text-slate-300 text-sm mb-2">
              Every announcement channel is published automatically. Legacy mode will be
              discontinued, and the bot may stop publishing in this server once it is retired.
              Migrate now to keep publishing without interruption, choose exactly which channels
              publish, and unlock new features.
            </p>
            <p className="text-amber-300 text-base font-semibold mb-4">
              Legacy mode ends on {legacySunsetLabel()}.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={() => setModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950"
              >
                Migrate now
              </Button>
              <Link
                href="/migration"
                target="_blank"
                className="text-sm text-amber-300 hover:text-amber-200 transition-colors"
              >
                Learn what is changing
              </Link>
            </div>
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
