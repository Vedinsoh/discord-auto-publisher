export enum BlacklistActions {
  ADD = 'add',
  REMOVE = 'remove',
}

export type SpamChannelsMap = Map<string, { count: number }>;
