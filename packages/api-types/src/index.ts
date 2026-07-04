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

/** Subscription status (mirrors Paddle statuses verbatim) */
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled';

/** Billing interval */
export type BillingInterval = 'month' | 'year';

/** Pending scheduled change on a subscription (cancel/pause at period end) */
export interface SubscriptionScheduledChange {
  action: 'cancel' | 'pause' | 'resume';
  effectiveAt: string;
}

/** Subscription data (JSON-serialized with portalUrl) */
export interface SubscriptionData {
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  currentPeriodEndsAt: string | null;
  scheduledChange: SubscriptionScheduledChange | null;
  canceledAt: string | null;
  portalUrl: string | null;
}

/** Guild dashboard aggregate response */
export interface GuildDashboardData {
  channels: GuildChannel[];
  subscription: SubscriptionData | null;
}

/** Checkout response: transaction ID consumed by Paddle.js overlay checkout */
export interface CheckoutResponse {
  transactionId: string;
}
