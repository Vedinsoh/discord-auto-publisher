'use client';

import { Crown, ExternalLink, Hourglass, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ChannelLimitReason } from '@/lib/api/types';
import { getBotInviteUrl, PREMIUM_BOT_CLIENT_ID } from '@/lib/invite';
import { useRefreshOnReturn } from '@/lib/use-refresh-on-return';

/**
 * Client-side mirror of the backend's channel-limit reasoning. Used where the
 * UI blocks the action before it reaches the backend (the migrate modal caps
 * selection locally), so no `code` is returned to branch on. Must stay in sync
 * with `Editions.resolveChannelLimit` on the backend.
 */
export function channelLimitReasonFromGuild(flags: {
  hasSubscription: boolean;
  premiumBotPresent: boolean;
  premiumPending: boolean;
}): ChannelLimitReason {
  if (!flags.hasSubscription) return 'LIMIT_FREE';
  return flags.premiumBotPresent ? 'LIMIT_PREMIUM_PENDING' : 'LIMIT_PREMIUM_INVITE';
}

export const CHANNEL_LIMIT_COPY: Record<ChannelLimitReason, { heading: string; body: string }> = {
  LIMIT_FREE: {
    heading: 'Channel limit reached',
    body: 'The free plan publishes in up to 3 channels. Upgrade to Premium to unlock unlimited channels and extra features.',
  },
  LIMIT_PREMIUM_INVITE: {
    heading: 'Invite your Premium bot to unlock more channels',
    body: "You're on Premium, but the Premium bot isn't in this server yet — the free bot is still publishing, so you're capped at 3 channels. Invite the Premium bot to unlock unlimited channels. Your channels and settings are kept.",
  },
  LIMIT_PREMIUM_PENDING: {
    heading: 'Premium is activating',
    body: "Your Premium bot is in the server but can't take over until it can publish in every configured channel. Grant it publish permission to finish switching — then you'll have unlimited channels.",
  },
};

/** The action button matching a rejection reason. Null when nothing to offer. */
export function ChannelLimitCta({
  reason,
  guildId,
}: {
  reason: ChannelLimitReason;
  guildId: string;
}) {
  const armRefreshOnReturn = useRefreshOnReturn();

  if (reason === 'LIMIT_PREMIUM_INVITE') {
    // Locked to the subscribed guild: the entitlement gate makes the premium
    // bot self-leave anywhere else.
    const inviteUrl = PREMIUM_BOT_CLIENT_ID
      ? getBotInviteUrl('premium', guildId, { lockGuildSelect: true })
      : null;
    if (!inviteUrl) return null;
    return (
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
    );
  }

  if (reason === 'LIMIT_PREMIUM_PENDING') {
    return (
      <Button className="bg-purple-600 hover:bg-purple-500 text-white" asChild>
        <Link href={`/dashboard/${guildId}/channels`}>Review channel permissions</Link>
      </Button>
    );
  }

  return (
    <Button className="bg-purple-600 hover:bg-purple-500 text-white" asChild>
      <Link href={`/dashboard/${guildId}/subscription`}>Upgrade to Premium</Link>
    </Button>
  );
}

/** Modal shown when enabling a channel is rejected for hitting the cap. */
export function ChannelLimitModal({
  reason,
  guildId,
  onClose,
}: {
  reason: ChannelLimitReason;
  guildId: string;
  onClose: () => void;
}) {
  const copy = CHANNEL_LIMIT_COPY[reason];
  const Icon = reason === 'LIMIT_PREMIUM_PENDING' ? Hourglass : Crown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <Card className="bg-slate-900 border-slate-700 w-full max-w-lg">
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-start gap-4">
            <Icon className="w-6 h-6 text-purple-400 shrink-0 mt-1" />
            <div>
              <h3 className="text-xl text-white mb-1">{copy.heading}</h3>
              <p className="text-slate-300 text-sm">{copy.body}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors shrink-0 ml-4"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex justify-end gap-3 p-6 pt-2">
          <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300">
            Close
          </Button>
          <ChannelLimitCta reason={reason} guildId={guildId} />
        </div>
      </Card>
    </div>
  );
}
