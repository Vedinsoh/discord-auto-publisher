'use client';

import { Crown, Filter, Hash, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { DiscordGuild } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { GuildSwitcher } from './server-switcher';
import { useGuildAttention } from './use-guild-attention';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Home, premiumOnly: false },
  { id: 'channels', label: 'Channels', icon: Hash, premiumOnly: false },
  { id: 'filters', label: 'Filters', icon: Filter, premiumOnly: true },
  { id: 'subscription', label: 'Subscription', icon: Crown, premiumOnly: false },
] as const;

interface GuildDashboardShellProps {
  guild: DiscordGuild;
  guilds: DiscordGuild[];
  children: React.ReactNode;
}

export function GuildDashboardShell({ guild, guilds, children }: GuildDashboardShellProps) {
  const pathname = usePathname();
  // Attention badge on the Overview tab, visible from every tab (shell is inside
  // GuildProvider). Shared count so it never drifts from the banner stack.
  const { badgeCount } = useGuildAttention();

  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Dashboard Grid with Sidebar */}
        <div className="grid lg:grid-cols-[250px_1fr] gap-6">
          {/* Sidebar Navigation */}
          <div className="space-y-2">
            <GuildSwitcher guilds={guilds} current={guild} />
            <div className="h-px bg-slate-800 my-6" />
            {tabs.map(tab => {
              const href = `/dashboard/${guild.id}/${tab.id}`;
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
                  {tab.id === 'overview' && badgeCount > 0 && (
                    <output
                      className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-medium"
                      aria-label={`${badgeCount} item${badgeCount !== 1 ? 's' : ''} need attention`}
                    >
                      {badgeCount}
                    </output>
                  )}
                  {tab.premiumOnly && (
                    <Crown className="w-3.5 h-3.5 ml-auto group-hover:text-yellow-500" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Main Content Area */}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
