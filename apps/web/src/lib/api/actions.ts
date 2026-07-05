'use server';

import { backendFetch } from '@/lib/api/backend';
import type {
  BackendDiscordGuild,
  CheckoutResponse,
  DiscordGuild,
  Edition,
  GuildChannel,
  GuildDashboardData,
  SubscriptionDetail,
} from '@/lib/api/types';

export async function getUserGuilds(): Promise<DiscordGuild[]> {
  const [freeResult, premiumResult] = await Promise.allSettled([
    backendFetch<BackendDiscordGuild[]>('free', '/api/user/guilds'),
    backendFetch<BackendDiscordGuild[]>('premium', '/api/user/guilds'),
  ]);

  if (freeResult.status === 'rejected' && premiumResult.status === 'rejected') {
    throw new Error('Failed to fetch guilds from all backends');
  }

  const freeGuilds = freeResult.status === 'fulfilled' ? freeResult.value : [];
  const premiumGuilds = premiumResult.status === 'fulfilled' ? premiumResult.value : [];

  const guildMap = new Map<string, DiscordGuild>();

  for (const g of freeGuilds) {
    guildMap.set(g.id, {
      id: g.id,
      name: g.name,
      icon: g.icon,
      permissions: g.permissions,
      freeBotPresent: g.botPresent,
      premiumBotPresent: false,
      migrated: g.migrated,
      hasSubscription: false,
    });
  }

  for (const g of premiumGuilds) {
    const existing = guildMap.get(g.id);
    if (existing) {
      existing.premiumBotPresent = g.botPresent;
      existing.hasSubscription = g.hasSubscription;
      // The managing edition is premium when its bot is present
      if (g.botPresent) {
        existing.migrated = g.migrated;
      }
    } else {
      guildMap.set(g.id, {
        id: g.id,
        name: g.name,
        icon: g.icon,
        permissions: g.permissions,
        freeBotPresent: false,
        premiumBotPresent: g.botPresent,
        migrated: g.migrated,
        hasSubscription: g.hasSubscription,
      });
    }
  }

  return Array.from(guildMap.values());
}

export async function getGuildDashboard(
  edition: Edition,
  guildId: string
): Promise<GuildDashboardData> {
  return backendFetch<GuildDashboardData>(edition, `/api/guild/${guildId}`);
}

export async function getGuildChannels(edition: Edition, guildId: string): Promise<GuildChannel[]> {
  return backendFetch<GuildChannel[]>(edition, `/api/guild/${guildId}/channels`);
}

export async function enableChannel(
  edition: Edition,
  guildId: string,
  channelId: string
): Promise<void> {
  await backendFetch(edition, `/api/guild/${guildId}/channel/${channelId}`, {
    method: 'PUT',
  });
}

export async function disableChannel(
  edition: Edition,
  guildId: string,
  channelId: string
): Promise<void> {
  await backendFetch(edition, `/api/guild/${guildId}/channel/${channelId}`, {
    method: 'DELETE',
  });
}

/** MIGRATION: Remove after migration period (6 months) */
export async function migrateGuild(
  edition: Edition,
  guildId: string,
  channelIds: string[]
): Promise<void> {
  await backendFetch(edition, `/api/guild/${guildId}/migrate`, {
    method: 'POST',
    body: JSON.stringify({ channelIds }),
  });
}

export async function getSubscription(
  edition: Edition,
  guildId: string
): Promise<SubscriptionDetail | null> {
  return backendFetch<SubscriptionDetail | null>(edition, `/api/guild/${guildId}/subscription`);
}

export async function createCheckout(
  edition: Edition,
  guildId: string,
  interval: 'month' | 'year'
): Promise<CheckoutResponse> {
  return backendFetch<CheckoutResponse>(edition, `/api/guild/${guildId}/subscription/checkout`, {
    method: 'POST',
    body: JSON.stringify({ interval }),
  });
}
