'use client';

import { createContext, use, useContext } from 'react';
import { useCurrentGuild } from '@/components/dashboard/guild-list-context';
import { type AuthExpiredSentinel, AuthExpiredSignal, isAuthExpired } from '@/lib/api/auth-expired';
import type { DiscordGuild, GuildDashboardData } from '@/lib/api/types';

interface GuildContextValue {
  guildId: string;
  // May resolve to the auth-expired sentinel; useGuild() turns that into a
  // client-side throw the shell's error boundary routes to re-login (ADR 0010).
  dataPromise: Promise<GuildDashboardData | AuthExpiredSentinel>;
}

const GuildContext = createContext<GuildContextValue | null>(null);

/**
 * Provides the current guild's identity (resolved synchronously from the guild
 * list) plus its detail payload as a PROMISE. `useGuild()` unwraps the promise
 * with `use()`, so only components that read guild detail suspend — the shell
 * chrome (switcher/tabs), which needs only the list + route param, renders
 * immediately (ADR 0007, 2026-07-15). The identity comes from the list because
 * the detail payload carries no name/icon (fetching them would cost a Discord
 * call).
 */
export function GuildProvider({
  guildId,
  dataPromise,
  children,
}: GuildContextValue & { children: React.ReactNode }) {
  return <GuildContext.Provider value={{ guildId, dataPromise }}>{children}</GuildContext.Provider>;
}

/**
 * Current guild identity + detail data. SUSPENDS the calling component until
 * the detail promise resolves (wrap consumers in a Suspense boundary); THROWS
 * to the nearest error boundary if the detail read fails. Must be called within
 * a GuildProvider whose guild is present in the list (the shell redirects a
 * missing guild before rendering children).
 */
export function useGuild(): { guild: DiscordGuild; data: GuildDashboardData } {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error('useGuild must be used within GuildProvider');
  }
  const data = use(context.dataPromise);
  // Dead Discord token: re-throw as a typed signal so the shell's error boundary
  // routes to re-login instead of the generic server-list redirect (ADR 0010).
  if (isAuthExpired(data)) {
    throw new AuthExpiredSignal();
  }
  const guild = useCurrentGuild(context.guildId);
  if (!guild) {
    throw new Error('useGuild: current guild not in list');
  }
  return { guild, data };
}
