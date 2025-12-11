import { z } from 'zod';

// Regular expression patterns
export const RegExPatterns = {
  snowflake: /^(?<id>\d{17,20})$/,
};

// Base validation schemas
export const Validations = {
  snowflakeId: z.string().refine((value: string) => RegExPatterns.snowflake.test(value), {
    message: 'Invalid snowflake ID',
  }),
};

// Filter enums (using const objects for Bun ES module compatibility)
export const FilterType = {
  Keyword: 'keyword',
  Mention: 'mention',
  Author: 'author',
  Webhook: 'webhook',
} as const;

export const FilterMode = {
  Allow: 'allow',
  Block: 'block',
} as const;

export const FilterMatchMode = {
  Any: 'any',
  All: 'all',
} as const;

// Type exports for type-checking
export type FilterType = (typeof FilterType)[keyof typeof FilterType];
export type FilterMode = (typeof FilterMode)[keyof typeof FilterMode];
export type FilterMatchMode = (typeof FilterMatchMode)[keyof typeof FilterMatchMode];

// Filter validation schemas
export const FilterTypeSchema = z.enum(Object.values(FilterType));
export const FilterModeSchema = z.enum(Object.values(FilterMode));
export const FilterMatchModeSchema = z.enum(Object.values(FilterMatchMode));

export const FilterSchema = z.object({
  id: z.string(),
  type: FilterTypeSchema,
  mode: FilterModeSchema,
  values: z.array(z.string().min(1).max(200)),
  createdAt: z.date(),
});

export const CreateFilterSchema = z
  .object({
    type: FilterTypeSchema,
    mode: FilterModeSchema,
    values: z.array(z.string().min(1).max(200)).min(1, 'At least one value is required'),
  })
  .refine(
    filter => {
      // Max values per type
      const maxValues: Record<string, number> = {
        keyword: 20,
        mention: 10,
        author: 10,
        webhook: 10,
      };
      const max = maxValues[filter.type];
      return max !== undefined && filter.values.length <= max;
    },
    {
      message: 'Maximum amount of values exceeded for filter type',
    }
  );

export type Filter = z.infer<typeof FilterSchema>;
export type CreateFilter = z.infer<typeof CreateFilterSchema>;
