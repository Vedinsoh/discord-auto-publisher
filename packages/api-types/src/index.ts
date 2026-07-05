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
  /** MIGRATION: false = legacy guild (auto-publishes everything). Removed at sunset. */
  migrated: boolean;
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
  /** MIGRATION: resolved from the managing edition (premium wins). Removed at sunset. */
  migrated: boolean;
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
  /** MIGRATION: present on legacy guilds only — migrate-modal preselection. */
  canPublish?: boolean;
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

/** Subscription summary (part of the guild dashboard aggregate) */
export interface SubscriptionData {
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  currentPeriodEndsAt: string | null;
  scheduledChange: SubscriptionScheduledChange | null;
  canceledAt: string | null;
}

/** The Discord user who paid for the subscription */
export interface SubscriptionSubscriber {
  id: string;
  /** Resolved display name; null when resolution failed or requester is the subscriber */
  username: string | null;
}

/**
 * Full subscription detail from GET /api/guild/:guildId/subscription.
 * portalUrl is set only when the requester is the subscriber.
 */
export interface SubscriptionDetail extends SubscriptionData {
  portalUrl: string | null;
  isSubscriber: boolean;
  subscriber: SubscriptionSubscriber;
}

/** Guild dashboard aggregate response */
export interface GuildDashboardData {
  /** MIGRATION: false = legacy guild (auto-publishes everything). Removed at sunset. */
  migrated: boolean;
  /** Max enabled channels for this backend's plan; 0 = unlimited */
  channelLimit: number;
  channels: GuildChannel[];
  subscription: SubscriptionData | null;
}

/** Checkout response: transaction ID consumed by Paddle.js overlay checkout */
export interface CheckoutResponse {
  transactionId: string;
}
