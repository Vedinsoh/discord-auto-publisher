export enum DatabaseIDs {
  Channels, // Channel IDs from "channels" collection in DB
  ChannelsCrosspostsCount, // Count of crossposted messages for each channel
  RateLimitsCache, // Cache for global request limits to avoid hitting rate limits
}

export enum Keys {
  Channel = 'channel',
}

export const Redis = {
  DatabaseIDs,
  Keys,
};
