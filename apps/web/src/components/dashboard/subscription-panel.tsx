'use client';

import {
  AlertCircle,
  Calendar,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createCheckout } from '@/lib/api/actions';
import type { Edition, SubscriptionData } from '@/lib/api/types';

interface SubscriptionPanelProps {
  edition: Edition;
  guildId: string;
  guildName: string;
  subscription: SubscriptionData | null;
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

const PREMIUM_BOT_CLIENT_ID = process.env.NEXT_PUBLIC_PREMIUM_BOT_CLIENT_ID;

function getPremiumBotInviteUrl(guildId: string): string {
  return `https://discord.com/oauth2/authorize?client_id=${PREMIUM_BOT_CLIENT_ID}&permissions=10240&scope=bot+applications.commands&guild_id=${guildId}`;
}

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
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  paused: {
    label: 'Paused',
    className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  },
};

export function SubscriptionPanel({
  edition,
  guildId,
  guildName,
  subscription,
}: SubscriptionPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-white mb-2">Subscription Management</h2>
        <p className="text-slate-400">Manage your premium subscription for this server</p>
      </div>

      {subscription && (subscription.status === 'active' || subscription.status === 'trialing') ? (
        <ActiveSubscription subscription={subscription} />
      ) : (
        <FreeSubscription edition={edition} guildId={guildId} guildName={guildName} />
      )}
    </div>
  );
}

function ActiveSubscription({ subscription }: { subscription: SubscriptionData }) {
  const statusInfo = statusLabels[subscription.status] ?? statusLabels.active;

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
              </div>
              <p className="text-slate-400">All premium features unlocked</p>
            </div>
          </div>
        </div>

        {subscription.currentPeriodEndsAt && (
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 mb-6">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Calendar className="w-4 h-4" />
              <span>
                {subscription.status === 'cancelled' ? 'Access Until' : 'Next Billing Date'}
              </span>
            </div>
            <p className="text-2xl text-white">
              {new Date(subscription.currentPeriodEndsAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        )}

        <ul className="space-y-3 mb-6">
          {premiumBenefits.map(benefit => (
            <li key={benefit} className="flex items-center gap-3 text-slate-300">
              <Check className="w-5 h-5 text-green-400 shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>

        {subscription.portalUrl && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              asChild
            >
              <a href={subscription.portalUrl} target="_blank" rel="noopener noreferrer">
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Billing
                <ExternalLink className="w-3 h-3 ml-2" />
              </a>
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function FreeSubscription({
  edition,
  guildId,
  guildName,
}: {
  edition: Edition;
  guildId: string;
  guildName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [checkoutState, setCheckoutState] = useState<'idle' | 'created' | 'error'>('idle');

  const handleUpgrade = useCallback(() => {
    startTransition(async () => {
      try {
        await createCheckout(edition, guildId);
        setCheckoutState('created');
      } catch {
        setCheckoutState('error');
      }
    });
  }, [edition, guildId]);

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

      {checkoutState === 'created' && PREMIUM_BOT_CLIENT_ID && (
        <Card className="bg-green-500/10 border-green-500/30 p-6">
          <h3 className="text-white text-lg mb-2">Almost there!</h3>
          <p className="text-slate-400 mb-4">
            After completing checkout, invite the Premium bot to your server:
          </p>
          <Button className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white" asChild>
            <a href={getPremiumBotInviteUrl(guildId)} target="_blank" rel="noopener noreferrer">
              Invite Premium Bot
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
          <p className="text-slate-500 text-sm mt-3">
            After adding the Premium bot, you can remove the free bot from your server settings.
          </p>
        </Card>
      )}

      {checkoutState === 'error' && (
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
            <p className="text-slate-400 mb-4">Unlock all features for {guildName}</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl text-white">$4.99</span>
              <span className="text-slate-400 text-xl">/month</span>
            </div>
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
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Crown className="w-5 h-5 mr-2" />
            )}
            {isPending ? 'Processing...' : 'Upgrade to Premium'}
          </Button>

          <p className="text-slate-500 text-sm text-center mt-4">
            Billed monthly &bull; Cancel anytime &bull; 7-day money-back guarantee
          </p>
        </Card>
      </div>
    </div>
  );
}
