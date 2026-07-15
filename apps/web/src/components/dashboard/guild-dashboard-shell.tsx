'use client';

import { Crown, Filter, Hash, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import type { GuildDashboardData } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { ErrorBoundary, RedirectTo } from './error-redirect-boundary';
import { GuildProvider } from './guild-context';
import { useCurrentGuild } from './guild-list-context';
import { GuildSwitcher } from './server-switcher';
import { ChannelConfigSkeleton, GuildDashboardShellSkeleton } from './skeletons';
import { useGuildAttention } from './use-guild-attention';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Home, premiumOnly: false },
  { id: 'channels', label: 'Channels', icon: Hash, premiumOnly: false },
  { id: 'filters', label: 'Filters', icon: Filter, premiumOnly: true },
  { id: 'subscription', label: 'Subscription', icon: Crown, premiumOnly: false },
] as const;

interface GuildDashboardShellProps {
  guildId: string;
  dataPromise: Promise<GuildDashboardData>;
  children: React.ReactNode;
}

export function GuildDashboardShell({ guildId, dataPromise, children }: GuildDashboardShellProps) {
  const guild = useCurrentGuild(guildId);
  const router = useRouter();

  // A guild missing from the seeded list = the user gained access mid-session
  // and deep-linked, or the list fetch failed. Fall back to the server list and
  // refresh so the shared layout re-seeds from the server. Rare; simplest path.
  useEffect(() => {
    if (!guild) {
      router.replace('/dashboard');
      router.refresh();
    }
  }, [guild, router]);

  if (!guild) {
    return <GuildDashboardShellSkeleton />;
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
                A detail read failure (botless/unauthorized guild) throws at the
                child's useGuild() and this boundary redirects to the server list. */}
            <div>
              <ErrorBoundary
                key={guildId}
                fallback={
                  <RedirectTo path="/dashboard">
                    <ChannelConfigSkeleton />
                  </RedirectTo>
                }
              >
                <Suspense fallback={<ChannelConfigSkeleton />}>{children}</Suspense>
              </ErrorBoundary>
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
          <Link
            key={tab.id}
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
