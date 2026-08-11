export enum DatabaseIDs {
  Channels = 0,
  CrosspostQueue = 1,
  SublimitCounter = 2,
  BlockedChannels = 3,
  DiscordAuth = 4,
  // MIGRATION: retired at sunset (v6→v7 migration markers, derived from guild.migratedAt)
  MigratedGuilds = 5,
  PaddleWebhookDedupe = 6,
  // 7 retired (was LegacyGuildPerms) — legacy canPublish maps now recompute from
  // the backend's in-memory Discord read cache (ADR 0007)
  Alerts = 8,
  CrosspostQueuePremium = 9,
  SublimitCounterPremium = 10,
  BlockedChannelsPremium = 11,
  // Premium handover markers (backend-owned; premium bot reads on its hot path)
  PremiumPending = 12,
  // Per-guild publish-state hash (backend-owned; the bots push, dashboard + gate read)
  PublishState = 13,
  // Onboarding boost budget: remaining priority publishes for a newly-joined
  // guild. Shared, NOT per-edition — the budget must follow a guild through a
  // premium handover, and a per-edition key would hand the premium bot a fresh
  // 10 after takeover. Backend seeds it (registerNewGuild); both proxies read
  // at enqueue and decrement on a boosted publish.
  OnboardingBoost = 14,
}

/** Proxy-owned logical DBs, keyed by the proxy's edition */
export const ProxyDatabaseIDs = {
  free: {
    crosspostQueue: DatabaseIDs.CrosspostQueue,
    sublimitCounter: DatabaseIDs.SublimitCounter,
    blockedChannels: DatabaseIDs.BlockedChannels,
  },
  premium: {
    crosspostQueue: DatabaseIDs.CrosspostQueuePremium,
    sublimitCounter: DatabaseIDs.SublimitCounterPremium,
    blockedChannels: DatabaseIDs.BlockedChannelsPremium,
  },
} as const;

export enum Keys {
  Channel = 'channel',
  Sublimit = 'channel:sublimit',
  Blocked = 'channel:blocked',
  // MIGRATION: removed at sunset with the MigratedGuilds DB
  MigratedGuild = 'migrated_guild',
  PaddleEvent = 'paddle_event',
  Alert = 'alert',
  PremiumPending = 'premium_pending',
  PublishState = 'publish_state',
  Boost = 'boost',
}
