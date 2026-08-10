'use client';

import { BotOff, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getBotInviteUrl } from '@/lib/invite';
import { useRefreshOnReturn } from '@/lib/use-refresh-on-return';

/**
 * Shown in place of the dashboard on `BOT_NOT_PRESENT` (409) — guild viewable, no
 * bot in it, and only a fresh OAuth authorization restores one. Never invite the
 * premium bot here: the join rails make it leave without a live entitlement.
 */
export function BotAbsentCard({ guildId }: { guildId: string }) {
  const inviteUrl = getBotInviteUrl('free', guildId, { lockGuildSelect: true });
  const armRefreshOnReturn = useRefreshOnReturn();

  return (
    <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
      <BotOff className="w-8 h-8 text-slate-500 mx-auto mb-3" />
      <p className="text-slate-300 mb-1">Auto Publisher is not in this server</p>
      <p className="text-slate-500 text-sm mb-5 max-w-md mx-auto">
        Invite it back to start publishing again. Discord does not let a bot add itself, so this has
        to be done from your side. Your channel setup and filters are kept for 30 days.
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
  );
}
