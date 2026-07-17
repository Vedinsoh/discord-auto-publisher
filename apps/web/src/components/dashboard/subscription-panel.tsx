'use client';

import {
  AlertCircle,
  Calendar,
  Check,
  Crown,
  ExternalLink,
  Loader2,
  Lock,
  UserRound,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useGuild } from '@/components/dashboard/guild-context';
import { LegacyMigrateModal } from '@/components/dashboard/legacy-migrate-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createCheckout, getSubscription } from '@/lib/api/actions';
import type { SubscriptionData, SubscriptionDetail } from '@/lib/api/types';
import { guildIconUrl } from '@/lib/discord';
import { FREE_PLAN_FEATURES, PREMIUM_PLAN_FEATURES } from '@/lib/plans';
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

// Honest feature lists shared with the public /premium page so free/paid value
// reads the same everywhere (@/lib/plans is the single source).
const premiumBenefits = PREMIUM_PLAN_FEATURES;
const upgradeBenefits = PREMIUM_PLAN_FEATURES;
const freePlanFeatures = FREE_PLAN_FEATURES;

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
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-white mb-2">Subscription Management</h2>
        <p className="text-slate-400">Manage your premium subscription for this server</p>
      </div>

      <div className="max-w-md mx-auto">
        {subscription &&
        (subscription.status === 'active' ||
          subscription.status === 'trialing' ||
          subscription.status === 'past_due') ? (
          <ActiveSubscription guildId={guildId} subscription={subscription} />
        ) : (
          <FreeSubscription guildId={guildId} guildName={guildName} />
        )}
      </div>
    </div>
  );
}

function ActiveSubscription({
  guildId,
  subscription,
}: {
  guildId: string;
  subscription: SubscriptionData;
}) {
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
              <p className="text-slate-400">All premium features unlocked</p>
            </div>
          </div>
        </div>

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

        <ul className="space-y-3 mb-6">
          {premiumBenefits.map(benefit => (
            <li key={benefit} className="flex items-center gap-3 text-slate-300">
              <Check className="w-5 h-5 text-green-400 shrink-0" />
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
                  Manage subscription
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
        // inline checkout from _ptxn. Guild name + icon ride the query string for
        // the on-page server indicator (cosmetic — the guild is bound in the
        // transaction's server-set custom_data).
        const params = new URLSearchParams({ _ptxn: transactionId, g: guildName });
        const iconUrl = guildIconUrl(guild.id, guild.icon);
        if (iconUrl) params.set('icon', iconUrl);
        router.push(`/checkout?${params.toString()}`);
      } catch {
        setError(true);
      }
    });
  }, [guild.id, guild.icon, guildName, billingInterval, migrated, router]);

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <h3 className="text-white text-lg mb-2">You&apos;re on the Free Plan</h3>
            <p className="text-slate-400 mb-4">
              Upgrade to Premium to unlock advanced features and priority support
            </p>
            <ul className="space-y-2">
              {freePlanFeatures.map(feature => (
                <li key={feature} className="flex items-center gap-2 text-slate-400 text-sm">
                  <Check className="w-4 h-4 text-slate-600" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
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
              <p className="text-slate-300 text-sm mb-4">
                Auto Publisher is currently running in legacy mode, and migration is required to
                unlock Premium features. Premium adds per-channel filters and control &mdash; which
                start from choosing which channels to manage.
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

          <ul className="space-y-3 mb-8 max-w-md mx-auto">
            {upgradeBenefits.map(benefit => (
              <li key={benefit} className="flex items-center gap-3 text-slate-300">
                <Check className="w-5 h-5 text-blue-400 shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>

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
