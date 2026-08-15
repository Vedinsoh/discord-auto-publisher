'use client';

import { BotOff, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { shouldOfferWithdrawal, WithdrawalPanel } from '@/components/dashboard/withdrawal-panel';
import { useBotInviteUrl, useIsPublicInstance } from '@/components/site-config-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRefreshOnReturn } from '@/lib/use-refresh-on-return';
import { useSubscriptionDetail } from '@/lib/use-subscription-detail';

/**
 * Shown in place of the dashboard on `BOT_NOT_PRESENT` (409) — guild viewable, no
 * bot in it, and only a fresh OAuth authorization restores one. Never invite the
 * premium bot here: the join rails make it leave without a live entitlement.
 *
 * It carries the statutory withdrawal control (ZZP čl. 81.a / CRD Art 11a) because it
 * replaces every guild tab, the subscription one included, and losing Premium is what
 * empties a guild of bots — so a day-3 canceller would otherwise lose the control for
 * the remaining 11 days of a window st. 2 requires throughout.
 */
export function BotAbsentCard({ guildId }: { guildId: string }) {
  const inviteUrl = useBotInviteUrl('free', guildId, { lockGuildSelect: true });
  const armRefreshOnReturn = useRefreshOnReturn();
  // Self-host has no billing routes, so asking would only 404.
  const isPublicInstance = useIsPublicInstance();
  const { detail } = useSubscriptionDetail(guildId, isPublicInstance);
  const withdrawal = detail?.withdrawal ?? null;

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
        <BotOff className="w-8 h-8 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-300 mb-1">Auto Publisher is not in this server</p>
        <p className="text-slate-500 text-sm mb-5 max-w-md mx-auto">
          Invite it back to start publishing again. Discord does not let a bot add itself, so this
          has to be done from your side. Your channel setup and filters are kept for 30 days.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {inviteUrl && (
            <Button asChild onClick={armRefreshOnReturn}>
              <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
                Invite Auto Publisher
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to your servers</Link>
          </Button>
        </div>
      </Card>

      {shouldOfferWithdrawal(withdrawal) && withdrawal && (
        <WithdrawalPanel guildId={guildId} withdrawal={withdrawal} />
      )}
    </div>
  );
}
