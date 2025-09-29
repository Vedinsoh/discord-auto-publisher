import { z } from 'zod';

// Regular expression patterns
export const RegExPatterns = {
  snowflake: /^(?<id>\d{17,20})$/,
};

// Base validation schemas
export const Validations = {
  snowflakeId: z.string().refine((value: string) => RegExPatterns.snowflake.test(value), {
    error: value => `${value} is not a valid snowflake ID`,
  }),
};

// Request validation schemas
export const CrosspostReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
    messageId: Validations.snowflakeId,
  }),
});

export const PresenceReqSchema = z.object({
  params: z.object({
    appId: Validations.snowflakeId,
  }),
  body: z.object({
    count: z.number(),
  }),
});

// HTTP validation utility
export type ValidationSchema = z.ZodSchema;
