'use client';

import {
  AlertCircle,
  Calendar,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Loader2,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createCheckout, getSubscription } from '@/lib/api/actions';
import type { SubscriptionData, SubscriptionDetail } from '@/lib/api/types';
import { getBotInviteUrl, PREMIUM_BOT_CLIENT_ID } from '@/lib/invite';
import { usePaddle } from '@/lib/paddle';
import {
  formatUsd,
  PREMIUM_PRICE_MONTHLY_USD,
  PREMIUM_PRICE_YEARLY_USD,
  PREMIUM_YEARLY_PER_MONTH_USD,
  PREMIUM_YEARLY_SAVINGS_PERCENT,
  PREMIUM_YEARLY_SAVINGS_USD,
} from '@/lib/pricing';
import { useRefreshOnReturn } from '@/lib/use-refresh-on-return';

interface SubscriptionPanelProps {
  guildId: string;
  guildName: string;
  subscription: SubscriptionData | null;
  premiumBotPresent: boolean;
  /** Premium handover pending: free bot still publishes until permissions pass */
  premiumPending: boolean;
  checkoutSuccess?: boolean;
}

const premiumBenefits = [
  'Priority publishing',
  'Unlimited channels',
  'Advanced filters',
  'Priority support',
];

const upgradeBenefits = [
  'Priority publishing queue',
  'Unlimited channels',
  'Advanced message filters',
  'Priority 24/7 support',
  'Cancel anytime',
];

const freePlanFeatures = ['Basic auto-publishing', 'Limited to 3 channels', 'Standard support'];

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

export function SubscriptionPanel({
  guildId,
  guildName,
  subscription,
  premiumBotPresent,
  premiumPending,
  checkoutSuccess,
}: SubscriptionPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-white mb-2">Subscription Management</h2>
        <p className="text-slate-400">Manage your premium subscription for this server</p>
      </div>

      {checkoutSuccess && (
        <CheckoutSuccessCard guildId={guildId} premiumBotPresent={premiumBotPresent} />
      )}

      {premiumPending && <PremiumPendingCard guildId={guildId} />}

      {subscription &&
      (subscription.status === 'active' ||
        subscription.status === 'trialing' ||
        subscription.status === 'past_due') ? (
        <ActiveSubscription guildId={guildId} subscription={subscription} />
      ) : (
        <FreeSubscription guildId={guildId} guildName={guildName} />
      )}
    </div>
  );
}

function CheckoutSuccessCard({
  guildId,
  premiumBotPresent,
}: {
  guildId: string;
  premiumBotPresent: boolean;
}) {
  const armRefreshOnReturn = useRefreshOnReturn();
  // Locked to the subscribed guild: the premium entitlement gate makes the
  // bot self-leave any other guild
  const inviteUrl = PREMIUM_BOT_CLIENT_ID
    ? getBotInviteUrl('premium', guildId, { lockGuildSelect: true })
    : null;
  return (
    <Card className="bg-green-500/10 border-green-500/30 p-6">
      <div className="flex items-start gap-3">
        <Sparkles className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-white text-lg mb-2">Payment successful!</h3>
          <p className="text-slate-400 mb-4">
            Your premium subscription is being activated. This may take a few moments.
          </p>
          {!premiumBotPresent && inviteUrl && (
            <>
              <p className="text-slate-400 mb-3">
                Invite the Premium bot to your server to get started:
              </p>
              <Button className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white" asChild>
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
                automatically. Channels that still need access are flagged on the Channels tab.
              </p>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Shown while the free bot still covers the guild and the premium bot idles */
function PremiumPendingCard({ guildId }: { guildId: string }) {
  return (
    <Card className="bg-purple-500/10 border-purple-500/30 p-6">
      <div className="flex items-start gap-3">
        <Loader2 className="w-6 h-6 text-purple-400 shrink-0 mt-0.5 animate-spin" />
        <div>
          <h3 className="text-white text-lg mb-2">Premium bot is waiting to take over</h3>
          <p className="text-slate-400">
            The free bot keeps publishing until the Premium bot can publish in every configured
            channel. Check the{' '}
            <a href={`/dashboard/${guildId}/channels`} className="text-blue-400 hover:underline">
              Channels tab
            </a>{' '}
            for channels that still need access — the switch completes automatically once they all
            pass.
          </p>
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
  // The dashboard aggregate carries only the summary — portal URL and
  // subscriber attribution come from the dedicated subscription endpoint
  // (creates a Paddle portal session on demand, so it is not fetched eagerly)
  const [detail, setDetail] = useState<SubscriptionDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSubscription(guildId)
      .then(result => {
        if (!cancelled) setDetail(result);
      })
      .catch(() => {
        // Non-fatal: panel renders without the billing footer
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

        {detail?.isSubscriber && detail.portalUrl && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              asChild
            >
              <a href={detail.portalUrl} target="_blank" rel="noopener noreferrer">
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Billing
                <ExternalLink className="w-3 h-3 ml-2" />
              </a>
            </Button>
          </div>
        )}

        {detail && !detail.isSubscriber && (
          <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-900/50 rounded-lg p-4 border border-slate-800">
            <UserRound className="w-4 h-4 shrink-0" />
            <span>
              Billing is managed by{' '}
              <span className="text-slate-300">
                @{detail.subscriber.username ?? detail.subscriber.id}
              </span>
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}

type BillingInterval = 'month' | 'year';

function FreeSubscription({ guildId, guildName }: { guildId: string; guildName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('year');

  const router = useRouter();
  const paddle = usePaddle(
    useCallback(() => {
      // Webhook activates the subscription; success card covers the gap
      router.push(`/dashboard/${guildId}/subscription?success=true`);
      router.refresh();
    }, [guildId, router])
  );

  const handleUpgrade = useCallback(() => {
    if (!paddle) return;
    setError(false);
    startTransition(async () => {
      try {
        const { transactionId } = await createCheckout(guildId, billingInterval);
        paddle.Checkout.open({ transactionId });
      } catch {
        setError(true);
      }
    });
  }, [guildId, billingInterval, paddle]);

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

          <Button
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg py-6"
            onClick={handleUpgrade}
            disabled={isPending || !paddle}
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Crown className="w-5 h-5 mr-2" />
            )}
            {isPending ? 'Opening checkout...' : 'Upgrade to Premium'}
          </Button>

          <p className="text-slate-500 text-sm text-center mt-4">
            Secure payment via Paddle &bull; Cancel anytime &bull; 7-day money-back guarantee
          </p>
        </Card>
      </div>
    </div>
  );
}
