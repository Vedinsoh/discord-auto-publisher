import { redirect } from 'next/navigation';
import { GuildDashboardShell } from '@/components/dashboard/guild-dashboard-shell';
import { getGuildDashboard } from '@/lib/api/actions';
import { AUTH_EXPIRED, type AuthExpiredSentinel } from '@/lib/api/auth-expired';
import { AuthExpiredError } from '@/lib/api/backend';
import type { GuildDashboardData } from '@/lib/api/types';
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

  // Stream the guild-detail payload as a promise — do NOT await it here. The
  // shell chrome (switcher/sidebar) renders instantly from the persisted guild
  // list; only the content + attention badge suspend on this (ADR 0007,
  // 2026-07-15). Authorization + presence are enforced by the detail read
  // itself (requireGuildPermission + a botless-guild throw): a rejection surfaces
  // at the content's `use()` and the shell's error boundary redirects to the
  // server list, so no separate presence gate is needed here.
  //
  // A dead Discord token (401) is mapped to a serializable sentinel rather than
  // left to reject: errors are sanitized across the RSC boundary, so the client
  // can't tell auth-expiry from a botless guild by error identity. useGuild()
  // turns the sentinel back into a client-side throw the boundary routes to
  // re-login (ADR 0010).
  const dataPromise: Promise<GuildDashboardData | AuthExpiredSentinel> = getGuildDashboard(guildId)
    .then(raw => ({
      ...raw,
      channels: (raw.channels ?? []).map(ch => ({
        ...ch,
        filters: ch.filters ?? [],
      })),
    }))
    .catch((err: unknown) => {
      if (err instanceof AuthExpiredError) return AUTH_EXPIRED;
      throw err;
    });

  return (
    <GuildDashboardShell guildId={guildId} dataPromise={dataPromise}>
      {children}
    </GuildDashboardShell>
  );
}
