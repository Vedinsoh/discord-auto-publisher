import type { Snowflake } from 'discord-api-types/globals';

export interface InfoResponse {
  size: number;
  pending: number;
  channelQueues: number;
  paused: boolean;
  rateLimitsSize: number;
}

// Message Types
export interface ReceivedMessage {
  id: Snowflake;
  channel: {
    id: Snowflake;
  };
  content?: string;
  embeds?: unknown[];
}
