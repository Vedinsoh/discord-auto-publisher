import type { FilterMatchMode, FilterType } from '@ap/validations';

export type { FilterMatchMode, FilterType } from '@ap/validations';

/** App edition identifier */
export type Edition = 'free' | 'premium';

/**
 * Why a channel enable/migrate was rejected for hitting the per-guild cap.
 * The cap is enforced against the managing edition (the bot actually
 * publishing), so an entitled guild whose premium bot isn't serving yet is
 * still capped — the reason directs the user to the right resolution.
 * - `LIMIT_FREE` — no entitled subscription; upsell to buy Premium.
 * - `LIMIT_PREMIUM_INVITE` — entitled but the premium bot was never invited.
 * - `LIMIT_PREMIUM_PENDING` — entitled, premium bot present but handover pending
 *   (needs publish permissions before it takes over).
 */
export type ChannelLimitReason = 'LIMIT_FREE' | 'LIMIT_PREMIUM_INVITE' | 'LIMIT_PREMIUM_PENDING';

/** Guild entry from GET /api/user/guilds (per-edition bot presence) */
export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  freeBotPresent: boolean;
  premiumBotPresent: boolean;
  /** Premium handover pending: both bots present, free bot still managing */
  premiumPending: boolean;
  /** MIGRATION: false = legacy guild (auto-publishes everything). Removed at sunset. */
  migrated: boolean;
  hasSubscription: boolean;
}

/** Guild role for the mention-filter picker (subset of Discord's role object) */
export interface GuildRole {
  id: string;
  name: string;
  /** Discord role color as an integer (0 = no color / default) */
  color: number;
}

/** Channel filter condition (JSON-serialized) */
export interface ChannelFilterRule {
  id: string;
  type: FilterType;
  /** true = negated operator ("doesn't contain"/"is not"); replaces the old allow/block mode */
  negate: boolean;
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
  /**
   * Whether the guild's MANAGING bot can currently crosspost here (from the
   * publish-state cache, ADR 0008). Present on every channel of the dashboard
   * aggregate; also drives legacy migrate-modal preselection.
   */
  canPublish?: boolean;
  /** Present while a premium handover is pending — false = "Premium bot needs access" badge */
  premiumBotHasPermissions?: boolean;
  /**
   * True for a disabled channel whose config is retained because it was paused
   * by the over-limit trim (ADR 0009) — drives the muted "Saved setup" tag.
   * Only ever true when `enabled` is false.
   */
  hasSavedSetup?: boolean;
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
  /** Whether the current requester is the subscriber (drives the manage-vs-note branch at first paint) */
  isSubscriber: boolean;
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
  subscriber: SubscriptionSubscriber;
}

/** Guild dashboard aggregate response */
export interface GuildDashboardData {
  /** MIGRATION: false = legacy guild (auto-publishes everything). Removed at sunset. */
  migrated: boolean;
  /** Premium handover pending: premium bot idle until its permissions pass everywhere */
  premiumPending: boolean;
  /** Max enabled channels for the guild's managing edition; 0 = unlimited */
  channelLimit: number;
  channels: GuildChannel[];
  subscription: SubscriptionData | null;
}

/** Checkout response: transaction ID consumed by Paddle.js overlay checkout */
export interface CheckoutResponse {
  transactionId: string;
}
