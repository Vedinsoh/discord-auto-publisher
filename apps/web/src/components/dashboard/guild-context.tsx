'use client';

import { createContext, useContext } from 'react';
import type { DiscordGuild, GuildDashboardData } from '@/lib/api/types';

interface GuildContextValue {
  guild: DiscordGuild;
  data: GuildDashboardData;
}

const GuildContext = createContext<GuildContextValue | null>(null);

interface GuildProviderProps extends GuildContextValue {
  children: React.ReactNode;
}

export function GuildProvider({ guild, data, children }: GuildProviderProps) {
  return <GuildContext.Provider value={{ guild, data }}>{children}</GuildContext.Provider>;
}

export function useGuild() {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error('useGuild must be used within GuildProvider');
  }
  return context;
}
