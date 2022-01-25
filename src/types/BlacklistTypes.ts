export type BlacklistActions = 'add' | 'remove';

export type SpamChannelsMap = Map<
  string,
  {
    count: number;
    remaining: number;
  }
>;

export type SpamGuildsMap = Map<
  string,
  {
    count: number;
    channels: Map<string, number>;
    reportTimestamp: number;
  }
>;
