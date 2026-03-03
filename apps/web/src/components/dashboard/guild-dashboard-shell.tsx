'use client';

import { Crown, Filter, Hash } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { DiscordGuild } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import type { DashboardUser } from './guild-context';
import { UserBadge } from './user-badge';

const tabs = [
  { id: 'channels', label: 'Channels', icon: Hash, premiumOnly: false },
  { id: 'filters', label: 'Filters', icon: Filter, premiumOnly: true },
  { id: 'subscription', label: 'Subscription', icon: Crown, premiumOnly: false },
] as const;

function guildIconUrl(guild: DiscordGuild): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=64`;
}

interface GuildDashboardShellProps {
  guild: DiscordGuild;
  user: DashboardUser;
  children: React.ReactNode;
}

export function GuildDashboardShell({ guild, user, children }: GuildDashboardShellProps) {
  const pathname = usePathname();
  const iconUrl = guildIconUrl(guild);
  const isPremium = guild.premiumBotPresent || guild.hasSubscription;

  return (
    <div className="min-h-screen px-4 pt-24 pb-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Link
                href="/dashboard"
                className="text-blue-400 hover:text-blue-300 text-sm mb-2 flex items-center gap-1"
              >
                &larr; Back to servers
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-2xl overflow-hidden">
                  {iconUrl ? (
                    <Image
                      src={iconUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      width={48}
                      height={48}
                    />
                  ) : (
                    <span className="text-white text-lg font-semibold">
                      {guild.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl text-white flex items-center gap-2">
                    {guild.name}
                    {guild.hasSubscription && <Crown className="w-6 h-6 text-yellow-500" />}
                  </h1>
                </div>
              </div>
            </div>
            <UserBadge user={user} />
          </div>
        </div>

        {/* Dashboard Grid with Sidebar */}
        <div className="grid lg:grid-cols-[250px_1fr] gap-6">
          {/* Sidebar Navigation */}
          <div className="space-y-2">
            {tabs
              .filter(tab => !tab.premiumOnly || isPremium)
              .map(tab => {
                const href = `/dashboard/${guild.id}/${tab.id}`;
                const isActive = pathname.startsWith(href);

                return (
                  <Link
                    key={tab.id}
                    href={href}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                      isActive
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'bg-slate-900/50 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-300'
                    )}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.label}</span>
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
