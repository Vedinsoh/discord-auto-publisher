'use client';

import {
  AlertCircle,
  Calendar,
  Check,
  Crown,
  ExternalLink,
  Hourglass,
  Loader2,
  Lock,
  PauseCircle,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  ChannelLimitCta,
  channelLimitReasonFromGuild,
} from '@/components/dashboard/channel-limit-upsell';
import { useGuild } from '@/components/dashboard/guild-context';
import { LegacyMigrateModal } from '@/components/dashboard/legacy-migrate-modal';
import { PlanComparisonTable } from '@/components/plan-comparison-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createCheckout, getSubscription } from '@/lib/api/actions';
import type { SubscriptionData, SubscriptionDetail } from '@/lib/api/types';
import { legacySunsetLabel } from '@/lib/constants';
import { guildIconUrl } from '@/lib/discord';
import {
  isPremiumFeatureKey,
  PREMIUM_FEATURE_BLURBS,
  PREMIUM_PLAN_FEATURES,
  type PremiumFeatureKey,
} from '@/lib/plans';
import {
  formatUsd,
  PREMIUM_PRICE_MONTHLY_USD,
  PREMIUM_PRICE_YEARLY_USD,
  PREMIUM_YEARLY_PER_MONTH_USD,
  PREMIUM_YEARLY_SAVINGS_PERCENT,
  PREMIUM_YEARLY_SAVINGS_USD,
} from '@/lib/pricing';

interface SubscriptionPanelProps {
  guildId: string;
  guildName: string;
  subscription: SubscriptionData | null;
}

// Honest feature list shared with the public /premium page so paid value reads
// the same everywhere (@/lib/plans is the single source). The free state doesn't
// use it — it renders PLAN_COMPARISON, which states both sides of every row.
const premiumBenefits = PREMIUM_PLAN_FEATURES;

const statusLabels: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  trialing: {
    label: 'Trial',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  past_due: {
    label: 'Past Due',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  canceled: {
    label: 'Cancelled',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  paused: {
    label: 'Paused',
    className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  },
};

const intervalLabels: Record<string, string> = {
  month: 'Monthly',
  year: 'Yearly',
};

export function SubscriptionPanel({ guildId, guildName, subscription }: SubscriptionPanelProps) {
  const searchParams = useSearchParams();

  // Narrowed rather than a boolean flag so the entitled branch keeps a non-null
  // subscription without an assertion.
  const entitledSubscription =
    subscription &&
    (subscription.status === 'active' ||
      subscription.status === 'trialing' ||
      subscription.status === 'past_due')
      ? subscription
      : null;

  // Continuity for someone who arrived from a locked premium tab. Gated on
  // "can't use it yet": an entitled server has no locked tab to come from, and
  // someone who navigated here to manage billing shouldn't be sold a feature.
  const fromParam = searchParams.get('from');
  const arrivedFrom =
    !entitledSubscription && isPremiumFeatureKey(fromParam)
      ? PREMIUM_FEATURE_BLURBS[fromParam]
      : null;

  return (
    <div className="space-y-6">
      {/* Register follows state: a free server is being offered something, an
          entitled one is administering something. The nav label stays
          "Subscription" either way — renaming a tab per plan state would make
          the same nav item mean different things to different users. */}
      <div>
        <h2 className="text-2xl text-white mb-2">{entitledSubscription ? 'Billing' : 'Premium'}</h2>
        <p className="text-slate-400">
          {entitledSubscription
            ? `Manage Premium for ${guildName}`
            : `Unlock unlimited channels and per-channel filters for ${guildName}`}
        </p>
      </div>

      {arrivedFrom && <FeatureContinuity feature={arrivedFrom} />}

      {/* Left-aligned rather than centred: a centred max-w-md card under a
          left-aligned heading (and, on arrival, a full-width continuity strip)
          reads as a different page width per plan state. max-w-2xl keeps the one
          card from stretching to the full content column. */}
      {entitledSubscription ? (
        <div className="max-w-2xl">
          <ActiveSubscription guildId={guildId} subscription={entitledSubscription} />
        </div>
      ) : (
        <FreeSubscription guildId={guildId} guildName={guildName} />
      )}
    </div>
  );
}

/**
 * Carries the promise the locked tab made into the page that keeps it: the
 * feature's name and the very same benefit lines, above the plan card.
 *
 * Deliberately NOT a second hero — neutral panel, no glow, small icon, benefits
 * as a wrapped inline row instead of the hero's vertical checklist. The upgrade
 * card and the locked tab's card are near-identical, so arriving here already
 * risks reading as a no-op; echoing that shape a third time would make it worse.
 * This has to look like a new element, because it is the evidence that pressing
 * the button did something.
 */
function FeatureContinuity({
  feature,
}: {
  feature: (typeof PREMIUM_FEATURE_BLURBS)[PremiumFeatureKey];
}) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 p-4">
      <div className="flex items-start gap-3">
        <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-white text-sm">
            <span className="text-blue-300">{feature.label}</span> is a Premium feature
          </p>
          <p className="text-slate-400 text-sm mt-1">{feature.description}</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {feature.benefits.map(benefit => (
              <li key={benefit} className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Check className="w-3.5 h-3.5 text-blue-400/70 shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function ActiveSubscription({
  guildId,
  subscription,
}: {
  guildId: string;
  subscription: SubscriptionData;
}) {
  const { guild, data } = useGuild();
  // Paid and working are different facts. Entitlement comes from Paddle, but
  // publishing only switches over once the Premium bot is in the guild AND the
  // handover has completed — so deriving this from subscription status alone told
  // entitled-but-not-yet-active servers that everything was unlocked. The
  // handover banners are mounted on Overview only, which left this page as the
  // one surface that could assert it with nothing to contradict it.
  const premiumActive = guild.premiumBotPresent && !data.premiumPending;
  // hasSubscription is true by construction here — this component only renders
  // for entitled statuses — so the shared mapper resolves to invite-vs-permissions.
  const handoverReason = premiumActive
    ? null
    : channelLimitReasonFromGuild({
        hasSubscription: true,
        premiumBotPresent: guild.premiumBotPresent,
        premiumPending: data.premiumPending,
      });
  const pastDue = subscription.status === 'past_due';

  // The branch (manage button vs "managed by @X") is known at first paint from
  // the aggregate's isSubscriber flag. The detail endpoint is fetched only for
  // the portal URL (a Paddle round-trip) and the co-admin's username — both
  // resolve into skeletons that hold their footprint until the fetch lands.
  const [detail, setDetail] = useState<SubscriptionDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
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
  }, [guildId]);

  const statusInfo = statusLabels[subscription.status] ?? statusLabels.active;
  const intervalLabel = subscription.billingInterval
    ? intervalLabels[subscription.billingInterval]
    : null;

  return (
    <div className="space-y-6">
      <Card className="bg-linear-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-2xl text-white">Premium Plan</h3>
                <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                {intervalLabel && (
                  <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                    {intervalLabel}
                  </Badge>
                )}
              </div>
              <p className="text-slate-400">
                {premiumActive
                  ? 'All premium features active'
                  : guild.premiumBotPresent
                    ? 'Activating — not publishing from this server yet'
                    : 'The Premium bot is not in this server yet'}
              </p>
            </div>
          </div>
        </div>

        {pastDue && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-sm mb-1">Payment failed</p>
              <p className="text-slate-300 text-sm">
                Update your payment method to keep Premium. Publishing continues in the meantime.
              </p>
            </div>
          </div>
        )}

        {handoverReason && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            {handoverReason === 'LIMIT_PREMIUM_PENDING' ? (
              <Hourglass className="w-5 h-5 text-purple-300 shrink-0 mt-0.5" />
            ) : (
              <Crown className="w-5 h-5 text-purple-300 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-white text-sm mb-1">
                {handoverReason === 'LIMIT_PREMIUM_PENDING'
                  ? 'Premium is activating'
                  : 'Invite the Premium bot to switch over'}
              </p>
              <p className="text-slate-300 text-sm mb-3">
                {handoverReason === 'LIMIT_PREMIUM_PENDING'
                  ? "The Premium bot is in this server but can't take over until it can publish in every enabled channel. Grant it publish permission to finish the switch."
                  : "Your subscription is active, but the Premium bot isn't in this server yet — the free bot is still publishing, and Premium features stay off until it takes over. Your channels and settings are kept."}
              </p>
              <ChannelLimitCta reason={handoverReason} guildId={guildId} />
            </div>
          </div>
        )}

        {(() => {
          const cancelScheduled = subscription.scheduledChange?.action === 'cancel';
          const dateValue = cancelScheduled
            ? subscription.scheduledChange?.effectiveAt
            : subscription.currentPeriodEndsAt;
          if (!dateValue) return null;
          return (
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 mb-6">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {cancelScheduled || subscription.status === 'canceled'
                    ? 'Access Until'
                    : 'Next Billing Date'}
                </span>
              </div>
              <p className="text-2xl text-white">
                {new Date(dateValue).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              {cancelScheduled && (
                <p className="text-slate-400 text-sm mt-2">
                  Your subscription is set to cancel at the end of the billing period.
                </p>
              )}
            </div>
          );
        })()}

        {/* Muted while the handover is incomplete — green ticks sitting above a
            notice that says Premium features are off would contradict it. */}
        <ul className="space-y-3 mb-6">
          {premiumBenefits.map(benefit => (
            <li key={benefit} className="flex items-center gap-3 text-slate-300">
              <Check
                className={`w-5 h-5 shrink-0 ${premiumActive ? 'text-green-400' : 'text-slate-600'}`}
              />
              {benefit}
            </li>
          ))}
        </ul>

        {subscription.isSubscriber ? (
          failed || (detail && !detail.portalUrl) ? (
            <div className="flex h-9 w-full items-center">
              <p className="text-slate-500 text-sm">Couldn&apos;t load billing controls.</p>
            </div>
          ) : detail?.portalUrl ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-blue-500/30 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
                asChild
              >
                <a href={detail.portalUrl} target="_blank" rel="noopener noreferrer">
                  {/* portalUrl is the subscription-scoped
                      updateSubscriptionPaymentMethod deep link, so this label is
                      literal, not a euphemism, when the card has failed. */}
                  {pastDue ? 'Update payment method' : 'Manage subscription'}
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex h-9 w-full items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-900/50 rounded-lg p-4 border border-slate-800">
            <UserRound className="w-4 h-4 shrink-0" />
            <span className="flex items-center gap-1">
              Billing is managed by{' '}
              {failed ? (
                <span className="text-slate-300">another member</span>
              ) : detail ? (
                <span className="text-slate-300">
                  @{detail.subscriber.username ?? detail.subscriber.id}
                </span>
              ) : (
                <Skeleton className="inline-block h-4 w-24 bg-slate-800" />
              )}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * Live channel usage for a migrated free guild — the one fact on this page that
 * is about THIS server rather than about the plans, and the reason the cap is
 * worth paying to remove. Reads `data.channelLimit` (authoritative for the
 * managing edition) rather than the FREE_CHANNEL_LIMIT display constant.
 *
 * Paused channels are surfaced here because the paused banner's CTA lands on
 * this page (ADR 0009): without the echo, the setup that banner promised is
 * "saved" is invisible at the moment of deciding whether to pay for it.
 */
function ChannelUsage() {
  const { guild, data } = useGuild();
  const enabled = data.channels.filter(channel => channel.enabled).length;
  const paused = data.channels.filter(channel => channel.hasSavedSetup).length;
  const limit = data.channelLimit;
  // channelLimit 0 = unlimited; unreachable in the free state today, but a bar
  // with no denominator would be a divide-by-zero rather than a design choice.
  const percentage = limit === 0 ? 0 : Math.min(100, (enabled / limit) * 100);
  const atLimit = limit !== 0 && enabled >= limit;

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-slate-400 text-sm">Channels in use</span>
        <span className="text-sm">
          <span className={atLimit ? 'text-yellow-400' : 'text-white'}>{enabled}</span>
          {limit !== 0 && <span className="text-slate-500"> of {limit}</span>}
        </span>
      </div>
      {limit !== 0 && (
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-all ${atLimit ? 'bg-yellow-500' : 'bg-blue-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      {paused > 0 && (
        <p className="text-slate-400 text-sm mt-3 flex items-start gap-2">
          <PauseCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <span>
            {paused} channel{paused !== 1 ? 's are' : ' is'} paused over the limit. Their setup is
            saved and returns with Premium &mdash;{' '}
            <Link
              href={`/dashboard/${guild.id}/channels`}
              className="text-blue-400 hover:underline"
            >
              review channels
            </Link>
            .
          </span>
        </p>
      )}
    </div>
  );
}

type BillingInterval = 'month' | 'year';

function FreeSubscription({ guildId, guildName }: { guildId: string; guildName: string }) {
  const { guild, data } = useGuild();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  // Preselect the interval the user picked on the public /premium page
  // (?upgrade=month|year, forwarded by the server selector); default to yearly,
  // which matches the "from $4.17/mo" framing shown everywhere else.
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(
    searchParams.get('upgrade') === 'month' ? 'month' : 'year'
  );
  const [migrateOpen, setMigrateOpen] = useState(false);

  // A guild must be migrated (allowlist model) before it can buy Premium —
  // Premium configures per-channel filters, which need registered channels.
  // MIGRATION: Remove this gate after migration period (6 months)
  const migrated = data.migrated;

  const router = useRouter();

  const handleUpgrade = useCallback(() => {
    if (!migrated) return;
    setError(false);
    startTransition(async () => {
      try {
        const { transactionId } = await createCheckout(guild.id, billingInterval);
        // Unified checkout: the /checkout page loads Paddle.js and auto-opens the
        // overlay from _ptxn. Guild name, icon and plan ride the query string to
        // orient the page sitting behind the overlay (all cosmetic — the guild is
        // bound in the transaction's server-set custom_data, and the overlay owns
        // the authoritative totals and renewal terms).
        const params = new URLSearchParams({
          _ptxn: transactionId,
          g: guildName,
          plan: billingInterval,
        });
        const iconUrl = guildIconUrl(guild.id, guild.icon);
        if (iconUrl) params.set('icon', iconUrl);
        router.push(`/checkout?${params.toString()}`);
      } catch {
        setError(true);
      }
    });
  }, [guild.id, guild.icon, guildName, billingInterval, migrated, router]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Left column: what you have now + migration gate. The comparison renders
          for legacy guilds too (they can still weigh the upgrade) — only the live
          channel usage is withheld, since a legacy guild publishes from every
          announcement channel and has no enabled-channel count to report. */}
      {/* flex-col gap rather than space-y: the first child is display:none below
          md, and space-y would leave its margin behind as a gap at the top of the
          column. Flex gap ignores hidden children. */}
      <div className="flex flex-col gap-6">
        {/* md and up only. Stacked on a phone this card sits between the heading
            and the price, pushing the CTA — the reason the page exists — off
            screen; the comparison is reference material, not the primary action.
            Live channel usage and the paused-channels echo ride inside it, so
            they're desktop-only too; both are also on Overview and Channels. */}
        <Card className="hidden lg:block bg-slate-900/50 border-slate-800 p-6">
          <h3 className="text-white text-lg mb-1">You&apos;re on the Free plan</h3>
          <p className="text-slate-400 text-sm">
            Here&apos;s what changes with Premium for {guildName}.
          </p>
          {migrated && <ChannelUsage />}
          <PlanComparisonTable currentPlan="free" className="mt-5" />
        </Card>

        {error && (
          <Card className="bg-red-500/10 border-red-500/30 p-4">
            <p className="text-red-400 text-sm">Failed to create checkout. Please try again.</p>
          </Card>
        )}

        {/* MIGRATION: Remove this setup gate after migration period (6 months) */}
        {!migrated && (
          <Card className="bg-amber-500/10 border-amber-500/30 p-6">
            <div className="flex items-start gap-4">
              <Lock className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-white text-lg mb-1">Finish channel setup to unlock Premium</h3>
                <p className="text-slate-300 text-sm mb-2">
                  Auto Publisher is currently running in legacy mode, and migration is required to
                  unlock Premium features. Premium adds per-channel filters and control &mdash;
                  which start from choosing which channels to manage.
                </p>
                <p className="text-amber-300 text-sm mb-4">
                  Legacy mode ends on{' '}
                  <span className="text-white font-semibold">{legacySunsetLabel()}</span>.
                </p>
                <Button
                  onClick={() => setMigrateOpen(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950"
                >
                  Set up channels
                </Button>
                <p className="text-slate-500 text-sm mt-3">
                  Takes a few seconds. You can upgrade right after.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {migrateOpen && (
        <LegacyMigrateModal
          guildId={guildId}
          channels={data.channels}
          limit={data.channelLimit === 0 ? null : data.channelLimit}
          hasSubscription={guild.hasSubscription}
          premiumBotPresent={guild.premiumBotPresent}
          premiumPending={data.premiumPending}
          onClose={() => setMigrateOpen(false)}
        />
      )}

      {/* Right column: upgrade */}
      <div className="relative">
        <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-purple-500/20 blur-3xl" />
        <Card className="relative bg-linear-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-3xl text-white mb-2">Upgrade to Premium</h3>
            <p className="text-slate-400 mb-6">Unlock all features for {guildName}</p>

            {/* Billing interval toggle */}
            <div className="inline-flex items-center bg-slate-900/80 rounded-lg p-1 border border-slate-700 mb-6">
              <button
                type="button"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingInterval === 'month'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
                onClick={() => setBillingInterval('month')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  billingInterval === 'year'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
                onClick={() => setBillingInterval('year')}
              >
                Yearly
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  Save {PREMIUM_YEARLY_SAVINGS_PERCENT}%
                </span>
              </button>
            </div>

            {/* Price display */}
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl text-white">
                {billingInterval === 'month'
                  ? formatUsd(PREMIUM_PRICE_MONTHLY_USD)
                  : formatUsd(PREMIUM_YEARLY_PER_MONTH_USD)}
              </span>
              <span className="text-slate-400 text-xl">/month</span>
            </div>
            {billingInterval === 'year' && (
              <p className="text-slate-500 text-sm mt-2">
                Billed annually at {formatUsd(PREMIUM_PRICE_YEARLY_USD)}
                <span className="text-green-400 ml-2">
                  (save {formatUsd(PREMIUM_YEARLY_SAVINGS_USD)}/year)
                </span>
              </p>
            )}
          </div>

          {/* No feature list here on purpose: it used to repeat
              PREMIUM_PLAN_FEATURES verbatim beside the comparison table, which
              said the same things with the free side attached. Dropping it also
              shrinks this card away from being a pixel-twin of the locked tab's
              hero, which is what made arriving here read as a no-op. */}

          {/* Locked until migrated: disabled buttons swallow hover, so the
              native tooltip rides the wrapping span. MIGRATION: unwrap after
              migration period (6 months) */}
          <span className="block" title={migrated ? undefined : 'Finish channel setup first'}>
            <Button
              className="w-full bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg py-6"
              onClick={handleUpgrade}
              disabled={isPending || !migrated}
            >
              {!migrated ? (
                <Lock className="w-5 h-5 mr-2" />
              ) : isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Crown className="w-5 h-5 mr-2" />
              )}
              {isPending ? 'Upgrading...' : 'Upgrade to Premium'}
            </Button>
          </span>

          {migrated ? (
            <p className="text-slate-500 text-sm text-center mt-4">
              Secure payment via Paddle &bull; Cancel anytime
            </p>
          ) : (
            <p className="text-amber-400/80 text-sm text-center mt-4">
              Finish channel setup above to unlock checkout.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
