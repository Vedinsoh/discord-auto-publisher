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
}

export enum Keys {
  Channel = 'channel',
  Sublimit = 'channel:sublimit',
  Blocked = 'channel:blocked',
  MigratedGuild = 'migrated_guild',
  PaddleEvent = 'paddle_event',
  LegacyPerms = 'legacy_perms',
}
