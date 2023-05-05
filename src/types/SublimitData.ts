import type { Snowflake } from 'discord.js';

export interface SublimitedData {
  global: boolean;
  bucket: string;
  majorParameter: string;
  sublimit: number;
}

export interface SublimitedChannel {
  channelId: Snowflake;
  sublimit: number;
}
