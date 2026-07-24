export type {
  ChannelFilterRule,
  ChannelLimitReason,
  CheckoutResponse,
  DiscordGuild,
  Edition,
  FilterMatchMode,
  FilterMode,
  FilterType,
  GuildChannel,
  GuildDashboardData,
  GuildRole,
  SubscriptionData,
  SubscriptionDetail,
} from '@ap/api-types';

/** Payload for creating/updating a filter from the dashboard */
export interface FilterInput {
  type: import('@ap/api-types').FilterType;
  mode: import('@ap/api-types').FilterMode;
  values: string[];
}
