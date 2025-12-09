import { z } from 'zod';

export const RegExPatterns = {
  snowflake: /^(?<id>\d{17,20})$/,
};

export const Validations = {
  snowflakeId: z.string().refine((value: string) => RegExPatterns.snowflake.test(value), {
    message: 'Invalid snowflake ID',
  }),
};

export const CrosspostReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
    messageId: Validations.snowflakeId,
  }),
});

export const ChannelReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
  }),
});

export const ChannelEnableReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
  }),
  body: z.object({
    guildId: Validations.snowflakeId,
  }),
});

export const GuildReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
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
    channelId: Validations.snowflakeId,
  }),
});

export const AddFilterReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
  }),
  body: z
    .object({
      type: z.enum(['keyword', 'mention', 'author', 'webhook']),
      mode: z.enum(['allow', 'block']),
      values: z.array(z.string().min(1).max(200)),
    })
    .refine(
      data => {
        const maxValues = {
          keyword: 20,
          mention: 10,
          author: 10,
          webhook: 10,
        };
        return data.values.length <= maxValues[data.type];
      },
      {
        message: 'Too many filter values',
      }
    )
    .refine(data => data.values.length >= 1, {
      message: 'At least one value is required',
    }),
});

export const RemoveFilterReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
    filterId: z.string(),
  }),
});

export const UpdateFilterReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
    filterId: z.string(),
  }),
  body: z
    .object({
      type: z.enum(['keyword', 'mention', 'author', 'webhook']),
      mode: z.enum(['allow', 'block']),
      values: z.array(z.string().min(1).max(200)),
    })
    .refine(
      data => {
        const maxValues = {
          keyword: 20,
          mention: 10,
          author: 10,
          webhook: 10,
        };
        return data.values.length <= maxValues[data.type];
      },
      {
        message: 'Too many filter values',
      }
    )
    .refine(data => data.values.length >= 1, {
      message: 'At least one value is required',
    }),
});

export const SetFilterModeReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
  }),
  body: z.object({
    mode: z.enum(['any', 'all']),
  }),
});
