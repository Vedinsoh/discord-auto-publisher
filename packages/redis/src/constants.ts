export enum DatabaseIDs {
  Channels = 0,
  CrosspostQueue = 1,
  SublimitCounter = 2,
  BlockedChannels = 3,
  DiscordAuth = 4,
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
  MigratedGuild = 'migrated_guild',
  PaddleEvent = 'paddle_event',
  Alert = 'alert',
  PremiumPending = 'premium_pending',
  PublishState = 'publish_state',
}
