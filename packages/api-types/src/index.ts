import type { FilterMatchMode, FilterMode, FilterType } from '@ap/validations';

/** App edition identifier */
export type Edition = 'free' | 'premium';

/** Single backend response for user guilds (what each backend returns) */
export interface BackendDiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  botPresent: boolean;
  hasSubscription: boolean;
}

/** Merged guild for web dashboard (combined from both backends) */
export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  freeBotPresent: boolean;
  premiumBotPresent: boolean;
  hasSubscription: boolean;
}

/** Channel filter rule (JSON-serialized) */
export interface ChannelFilterRule {
  id: string;
  type: FilterType;
  mode: FilterMode;
  values: string[];
  createdAt: string;
}

/** Guild channel with filters (enriched with Discord channel info) */
export interface GuildChannel {
  channelId: string;
  name: string;
  type: number;
  enabled: boolean;
  filters: ChannelFilterRule[];
  filterMode: FilterMatchMode;
}

/** Subscription data (JSON-serialized with portalUrl) */
export interface SubscriptionData {
  id: string;
  guildId: string;
  stripeSubscriptionId: string | null;
  subscriberDiscordUserId: string;
  status: 'active' | 'cancelled' | 'past_due' | 'paused' | 'trialing';
  billingInterval: 'month' | 'year' | null;
  currentPeriodEndsAt: string | null;
  cancelledAt: string | null;
  portalUrl: string | null;
}

/** Guild dashboard aggregate response */
export interface GuildDashboardData {
  channels: GuildChannel[];
  subscription: SubscriptionData | null;
}

/** Checkout session response */
export interface CheckoutResponse {
  sessionUrl: string;
}
