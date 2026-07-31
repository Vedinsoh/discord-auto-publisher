'use client';

import { CreditCard, Crown, Filter, Hash, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, Suspense, useEffect } from 'react';
import type { GuildLoadFailure } from '@/lib/api/auth-expired';
import type { GuildDashboardData } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from './error-redirect-boundary';
import { GuildProvider } from './guild-context';
import { GuildDetailBoundary } from './guild-detail-boundary';
import { GuildErrorCard } from './guild-error-card';
import { useCurrentGuild, useGuildList } from './guild-list-context';
import { GuildSwitcher } from './server-switcher';
import { GuildDashboardShellSkeleton } from './skeletons';
import { useGuildAttention } from './use-guild-attention';

// `dividerBefore` separates configuration (what the bot does in this server)
// from account administration. A crown on Subscription read as "this tab is a
// premium feature" — the same thing the crown means on Filters — so it now takes
// CreditCard: the tab is about billing, and it's the one tab that is emphatically
// not gated. No section label: four items don't warrant headers, and labelling a
// group of one is noise.
// Spelled out on every tab (like premiumOnly) because the array is `as const`:
// an optional key present on one member only isn't readable off the union.
const tabs = [
  { id: 'overview', label: 'Overview', icon: Home, premiumOnly: false, dividerBefore: false },
  { id: 'channels', label: 'Channels', icon: Hash, premiumOnly: false, dividerBefore: false },
  { id: 'filters', label: 'Filters', icon: Filter, premiumOnly: true, dividerBefore: false },
  {
    id: 'subscription',
    label: 'Subscription',
    icon: CreditCard,
    premiumOnly: false,
    dividerBefore: true,
  },
] as const;

interface GuildDashboardShellProps {
  guildId: string;
  dataPromise: Promise<GuildDashboardData | GuildLoadFailure>;
  children: React.ReactNode;
}

export function GuildDashboardShell({ guildId, dataPromise, children }: GuildDashboardShellProps) {
  const guild = useCurrentGuild(guildId);
  const { error } = useGuildList();
  const router = useRouter();

  // A guild missing from a CLEANLY-loaded list = the user lost access, the bot
  // was removed, or a bad deep-link. Eject to the server list (it shows the
  // invite CTA / omits the guild). But a missing guild because the list FETCH
  // failed (`error`) is transient — stay put and let the user retry in place,
  // rather than bouncing to a server list that failed the same way (ADR 0010).
  useEffect(() => {
    if (!guild && !error) {
      router.replace('/dashboard');
      router.refresh();
    }
  }, [guild, error, router]);

  if (!guild) {
    // List load failed → retry in place; otherwise we're mid-redirect.
    return error ? (
      <div className="min-h-screen px-4 pt-24 pb-16">
        <div className="max-w-6xl mx-auto">
          <GuildErrorCard />
        </div>
      </div>
    ) : (
      <GuildDashboardShellSkeleton />
    );
  }

  return (
    <GuildProvider guildId={guildId} dataPromise={dataPromise}>
      <div className="min-h-screen px-4 pt-24 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Dashboard Grid with Sidebar */}
          <div className="grid lg:grid-cols-[250px_1fr] gap-6">
            {/* Sidebar — renders instantly from the guild list + route param; it
                does NOT wait on guild detail. Only the attention badge does (its
                own Suspense), so switching guilds never blanks the switcher/tabs
                (ADR 0007, 2026-07-15). */}
            <div className="space-y-2">
              <GuildSwitcher current={guild} />
              <div className="h-px bg-slate-800 my-6" />
              <SidebarTabs guildId={guildId} />
            </div>

            {/* Main Content Area — the only region that suspends on guild detail.
                A detail read failure throws at the child's useGuild(); the
                boundary redirects (unavailable), re-logs in (auth), or silently
                auto-retries then offers a manual card (transient). Keyed by
                guildId so the retry orchestrator resets on a guild switch. */}
            <div>
              <GuildDetailBoundary key={guildId} guildId={guildId}>
                {children}
              </GuildDetailBoundary>
            </div>
          </div>
        </div>
      </div>
    </GuildProvider>
  );
}

function SidebarTabs({ guildId }: { guildId: string }) {
  const pathname = usePathname();

  return (
    <>
      {tabs.map(tab => {
        const href = `/dashboard/${guildId}/${tab.id}`;
        const isActive = pathname.startsWith(href);

        return (
          <Fragment key={tab.id}>
            {tab.dividerBefore && <div className="h-px bg-slate-800 my-3" />}
            <Link
              href={href}
              className={cn(
                'group w-full flex items-center gap-2.5 p-3 rounded-lg text-sm transition-all',
                isActive
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === 'overview' && (
                <ErrorBoundary key={guildId} fallback={null}>
                  <Suspense fallback={null}>
                    <OverviewBadge />
                  </Suspense>
                </ErrorBoundary>
              )}
              {tab.premiumOnly && (
                <Crown className="w-3.5 h-3.5 ml-auto group-hover:text-yellow-500" />
              )}
            </Link>
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * Attention badge on the Overview tab, visible from every tab. Reads guild
 * detail via useGuildAttention (→ useGuild), so it suspends until detail
 * resolves — wrapped in a null Suspense so the sidebar chrome paints first and
 * the badge appears a beat later. Hidden at 0, so the late appearance is
 * invisible when there's nothing to flag.
 */
function OverviewBadge() {
  const { badgeCount } = useGuildAttention();
  if (badgeCount === 0) return null;
  return (
    <output
      className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-medium"
      aria-label={`${badgeCount} item${badgeCount !== 1 ? 's' : ''} need attention`}
    >
      {badgeCount}
    </output>
  );
}
