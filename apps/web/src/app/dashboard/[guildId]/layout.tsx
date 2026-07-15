import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { GuildProvider } from '@/components/dashboard/guild-context';
import { GuildDashboardShell } from '@/components/dashboard/guild-dashboard-shell';
import { GuildDashboardShellSkeleton } from '@/components/dashboard/skeletons';
import { getGuildDashboard, getUserGuilds } from '@/lib/api/actions';
import type { DiscordGuild, GuildDashboardData } from '@/lib/api/types';
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

  return (
    <Suspense fallback={<GuildDashboardShellSkeleton />}>
      <GuildShellLoader guildId={guildId}>{children}</GuildShellLoader>
    </Suspense>
  );
}

/**
 * Fetches guild list, validates guild, then fetches dashboard data before
 * rendering the shell — the shell's banner stack (and its migrate modal) read
 * dashboard data from context, so the whole page waits behind one skeleton
 * instead of streaming the sidebar first (accepted trade-off, see CONTEXT.md
 * "Guild-level banner stack").
 */
async function GuildShellLoader({
  guildId,
  children,
}: {
  guildId: string;
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

  return (
    <GuildDataProvider guild={guild} guildId={guildId}>
      <GuildDashboardShell guild={guild} guilds={guilds}>
        {children}
      </GuildDashboardShell>
    </GuildDataProvider>
  );
}

/** Fetches dashboard data and provides it via context */
async function GuildDataProvider({
  guild,
  guildId,
  children,
}: {
  guild: DiscordGuild;
  guildId: string;
  children: React.ReactNode;
}) {
  let data: GuildDashboardData;
  try {
    const raw = await getGuildDashboard(guildId);
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
    <GuildProvider guild={guild} data={data}>
      {children}
    </GuildProvider>
  );
}
