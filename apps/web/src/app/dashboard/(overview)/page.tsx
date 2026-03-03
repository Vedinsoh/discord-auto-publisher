import { redirect } from 'next/navigation';
import { ServerSelector } from '@/components/dashboard/server-selector';
import { getUserGuilds } from '@/lib/api/actions';
import type { DiscordGuild } from '@/lib/api/types';
import { auth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/dashboard');
  }

  let guilds: DiscordGuild[];
  let error = false;
  try {
    guilds = await getUserGuilds();
  } catch {
    guilds = [];
    error = true;
  }

  return (
    <ServerSelector
      guilds={guilds}
      error={error}
      user={{
        id: session.user.id,
        name: session.user.name ?? 'Unknown',
        username: session.user.username ?? session.user.name ?? 'unknown',
        image: session.user.image ?? null,
      }}
    />
  );
}
