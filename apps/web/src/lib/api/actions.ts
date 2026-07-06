'use server';

import { backendFetch } from '@/lib/api/backend';
import type {
  CheckoutResponse,
  DiscordGuild,
  GuildChannel,
  GuildDashboardData,
  SubscriptionDetail,
} from '@/lib/api/types';

export async function getUserGuilds(): Promise<DiscordGuild[]> {
  return backendFetch<DiscordGuild[]>('/api/user/guilds');
}

export async function getGuildDashboard(guildId: string): Promise<GuildDashboardData> {
  return backendFetch<GuildDashboardData>(`/api/guild/${guildId}`);
}

export async function getGuildChannels(guildId: string): Promise<GuildChannel[]> {
  return backendFetch<GuildChannel[]>(`/api/guild/${guildId}/channels`);
}

export async function enableChannel(guildId: string, channelId: string): Promise<void> {
  await backendFetch(`/api/guild/${guildId}/channel/${channelId}`, {
    method: 'PUT',
  });
}

export async function disableChannel(guildId: string, channelId: string): Promise<void> {
  await backendFetch(`/api/guild/${guildId}/channel/${channelId}`, {
    method: 'DELETE',
  });
}

/** MIGRATION: Remove after migration period (6 months) */
export async function migrateGuild(guildId: string, channelIds: string[]): Promise<void> {
  await backendFetch(`/api/guild/${guildId}/migrate`, {
    method: 'POST',
    body: JSON.stringify({ channelIds }),
  });
}

export async function getSubscription(guildId: string): Promise<SubscriptionDetail | null> {
  return backendFetch<SubscriptionDetail | null>(`/api/guild/${guildId}/subscription`);
}

export async function createCheckout(
  guildId: string,
  interval: 'month' | 'year'
): Promise<CheckoutResponse> {
  return backendFetch<CheckoutResponse>(`/api/guild/${guildId}/subscription/checkout`, {
    method: 'POST',
    body: JSON.stringify({ interval }),
  });
}
