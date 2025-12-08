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

// Filter validation schemas
export const FilterType = z.enum(['keyword', 'mention', 'author', 'webhook']);
export const FilterMode = z.enum(['allow', 'block']);
export const FilterMatchMode = z.enum(['any', 'all']);

export const FilterSchema = z.object({
  id: z.string(),
  type: FilterType,
  mode: FilterMode,
  values: z.array(z.string().min(1).max(200)),
  createdAt: z.date(),
});

export const CreateFilterSchema = z
  .object({
    type: FilterType,
    mode: FilterMode,
    values: z.array(z.string().min(1).max(200)).min(1, 'At least one value is required'),
  })
  .refine(
    data => {
      // Max values per type
      const maxValues: Record<'keyword' | 'mention' | 'author' | 'webhook', number> = {
        keyword: 20,
        mention: 10,
        author: 10,
        webhook: 10,
      };
      return data.values.length <= maxValues[data.type];
    },
    {
      message: 'Maximum values exceeded for filter type',
    }
  );

export type Filter = z.infer<typeof FilterSchema>;
export type CreateFilter = z.infer<typeof CreateFilterSchema>;
export type FilterType = z.infer<typeof FilterType>;
export type FilterMode = z.infer<typeof FilterMode>;
export type FilterMatchMode = z.infer<typeof FilterMatchMode>;

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

export const FilterReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
    channelId: Validations.snowflakeId,
  }),
});

export const AddFilterReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
    channelId: Validations.snowflakeId,
  }),
  body: CreateFilterSchema,
});

export const RemoveFilterReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
    channelId: Validations.snowflakeId,
    filterId: z.string(),
  }),
});

export const SetFilterModeReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
    channelId: Validations.snowflakeId,
  }),
  body: z.object({
    mode: FilterMatchMode,
  }),
});

// HTTP validation utility
export type ValidationSchema = z.ZodSchema;
