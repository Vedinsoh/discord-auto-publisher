import type { Snowflake } from 'discord-api-types/globals';
import { z } from 'zod';

// Service Response Types
export enum ResponseStatus {
  Success = 0,
  Failed = 1,
}

export interface ServiceResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;
}

export class ServiceResponseImpl<T = null> implements ServiceResponse<T> {
  success: boolean;
  message: string;
  data: T;
  statusCode: number;

  constructor(status: ResponseStatus, message: string, data: T, statusCode: number) {
    this.success = status === ResponseStatus.Success;
    this.message = message;
    this.data = data;
    this.statusCode = statusCode;
  }
}

export const ServiceResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema.optional(),
    statusCode: z.number(),
  });

// API Response Types
export interface GuildsCountResponse {
  data?: {
    count?: number;
  };
}

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
