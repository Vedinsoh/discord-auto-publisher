'use client';

import { createContext, useContext } from 'react';
import type { DiscordGuild, Edition, GuildDashboardData } from '@/lib/api/types';

export interface DashboardUser {
  id: string;
  name: string;
  username: string;
  image: string | null;
}

interface GuildContextValue {
  guild: DiscordGuild;
  data: GuildDashboardData;
  edition: Edition;
  user: DashboardUser;
}

const GuildContext = createContext<GuildContextValue | null>(null);

interface GuildProviderProps extends GuildContextValue {
  children: React.ReactNode;
}

export function GuildProvider({ guild, data, edition, user, children }: GuildProviderProps) {
  return (
    <GuildContext.Provider value={{ guild, data, edition, user }}>{children}</GuildContext.Provider>
  );
}

export function useGuild() {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error('useGuild must be used within GuildProvider');
  }
  return context;
}
