export enum DatabaseIDs {
  Channels = 0,
  CrosspostQueue = 1,
  SublimitCounter = 2,
  BlockedChannels = 3,
  DiscordAuth = 4,
  MigratedGuilds = 5,
  PaddleWebhookDedupe = 6,
  // MIGRATION: dropped together with MigratedGuilds at sunset
  LegacyGuildPerms = 7,
  Alerts = 8,
  CrosspostQueuePremium = 9,
  SublimitCounterPremium = 10,
  BlockedChannelsPremium = 11,
  // Premium handover markers (backend-owned; premium bot reads on its hot path)
  PremiumPending = 12,
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
  LegacyPerms = 'legacy_perms',
  Alert = 'alert',
  PremiumPending = 'premium_pending',
}
