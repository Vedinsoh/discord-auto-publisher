'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * In-place error card with a MANUAL retry, shown for a transient guild-load
 * failure (upstream 5xx / network blip) instead of ejecting to the server list
 * (ADR 0010). "Try again" runs `router.refresh()`, which re-runs the server
 * layout and its guild-list / guild-detail reads without leaving the current
 * URL. Manual, not auto-retry: the user decides when to re-hit the backend
 * while Discord is down, so a persistent outage can't spin a refresh loop that
 * re-issues the 60s-miss user-token fetch.
 */
export function GuildErrorCard({
  title = 'Could not load this server',
  description = 'A temporary problem reaching Discord. Your settings are safe — try again in a moment.',
}: {
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
      <TriangleAlert className="w-8 h-8 text-slate-500 mx-auto mb-3" />
      <p className="text-slate-300 mb-1">{title}</p>
      <p className="text-slate-500 text-sm mb-5">{description}</p>
      <Button
        variant="outline"
        onClick={() => startTransition(() => router.refresh())}
        disabled={isPending}
      >
        <RefreshCw className={isPending ? 'animate-spin' : ''} />
        Try again
      </Button>
    </Card>
  );
}
