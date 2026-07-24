'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * In-place error card with a MANUAL retry, shown for a transient guild-load
 * failure (upstream 5xx / network blip) instead of ejecting to the server list
 * (ADR 0010). The default "Try again" runs `router.refresh()`, re-running the
 * server layout and its guild-list / guild-detail reads without leaving the URL
 * — used by the guild-list failure path, which recovers on refresh alone.
 *
 * The guild-DETAIL path passes `onRetry` + `isPending`: a bare `router.refresh()`
 * there is insufficient because the latched error boundary must also be reset to
 * re-consume the fresh promise, so the boundary orchestrator owns the retry and
 * drives this button. Either way retry is MANUAL once shown: the user decides
 * when to re-hit the backend while Discord is down, so a persistent outage can't
 * spin a refresh loop that re-issues the 60s-miss user-token fetch.
 */
export function GuildErrorCard({
  title = 'Could not load this server',
  description = 'A temporary problem reaching Discord. Your settings are safe — try again in a moment.',
  onRetry,
  isPending: isPendingProp,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  isPending?: boolean;
}) {
  const router = useRouter();
  const [isPendingInternal, startTransition] = useTransition();
  const isPending = isPendingProp ?? isPendingInternal;

  const handleRetry = () => {
    if (onRetry) onRetry();
    else startTransition(() => router.refresh());
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 p-12 text-center">
      <TriangleAlert className="w-8 h-8 text-slate-500 mx-auto mb-3" />
      <p className="text-slate-300 mb-1">{title}</p>
      <p className="text-slate-500 text-sm mb-5">{description}</p>
      <Button variant="outline" onClick={handleRetry} disabled={isPending}>
        <RefreshCw className={isPending ? 'animate-spin' : ''} />
        Try again
      </Button>
    </Card>
  );
}
