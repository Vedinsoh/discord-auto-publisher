import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import type { DashboardUser } from '@/components/dashboard/guild-context';
import { GuildProvider } from '@/components/dashboard/guild-context';
import { GuildDashboardShell } from '@/components/dashboard/guild-dashboard-shell';
import {
  GuildDashboardContentSkeleton,
  GuildDashboardShellSkeleton,
} from '@/components/dashboard/skeletons';
import { getGuildDashboard, getUserGuilds } from '@/lib/api/actions';
import type { DiscordGuild, Edition, GuildDashboardData } from '@/lib/api/types';
import { auth } from '@/lib/auth';

export default async function GuildLayout({
  params,
  children,
}: {
  params: Promise<{ guildId: string }>;
  children: React.ReactNode;
}) {
  const [session, { guildId }] = await Promise.all([auth(), params]);

  if (!session?.user) {
    redirect('/dashboard');
  }

  const user: DashboardUser = {
    id: session.user.id,
    name: session.user.name ?? 'Unknown',
    username: session.user.username ?? session.user.name ?? 'unknown',
    image: session.user.image ?? null,
  };

  return (
    <Suspense fallback={<GuildDashboardShellSkeleton />}>
      <GuildShellLoader guildId={guildId} user={user}>
        {children}
      </GuildShellLoader>
    </Suspense>
  );
}

/** Fetches guild list, validates guild, renders shell with nested Suspense for content */
async function GuildShellLoader({
  guildId,
  user,
  children,
}: {
  guildId: string;
  user: DashboardUser;
  children: React.ReactNode;
}) {
  let guilds: DiscordGuild[];
  try {
    guilds = await getUserGuilds();
  } catch {
    redirect('/dashboard');
  }

  const guild = guilds.find(g => g.id === guildId);
  if (!guild || (!guild.freeBotPresent && !guild.premiumBotPresent)) {
    redirect('/dashboard');
  }

  const edition: Edition = guild.premiumBotPresent ? 'premium' : 'free';

  return (
    <GuildDashboardShell guild={guild} user={user}>
      <Suspense fallback={<GuildDashboardContentSkeleton />}>
        <GuildDataProvider guild={guild} edition={edition} guildId={guildId} user={user}>
          {children}
        </GuildDataProvider>
      </Suspense>
    </GuildDashboardShell>
  );
}

/** Fetches dashboard data and provides it via context */
async function GuildDataProvider({
  guild,
  edition,
  guildId,
  user,
  children,
}: {
  guild: DiscordGuild;
  edition: Edition;
  guildId: string;
  user: DashboardUser;
  children: React.ReactNode;
}) {
  let data: GuildDashboardData;
  try {
    const raw = await getGuildDashboard(edition, guildId);
    data = {
      ...raw,
      channels: (raw.channels ?? []).map(ch => ({
        ...ch,
        filters: ch.filters ?? [],
      })),
    };
  } catch {
    redirect('/dashboard');
  }

  return (
    <GuildProvider guild={guild} data={data} edition={edition} user={user}>
      {children}
    </GuildProvider>
  );
}
