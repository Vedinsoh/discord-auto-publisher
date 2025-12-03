import { z } from 'zod';

export const RegExPatterns = {
  snowflake: /^(?<id>\d{17,20})$/,
};

export const Validations = {
  snowflakeId: z.string().refine(
    (value: string) => RegExPatterns.snowflake.test(value),
    value => ({
      message: `${value} is not a valid snowflake ID`,
    })
  ),
};

export const CrosspostReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
    messageId: Validations.snowflakeId,
  }),
});

export const ChannelReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
    channelId: Validations.snowflakeId,
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
    guildId: Validations.snowflakeId,
    channelId: Validations.snowflakeId,
  }),
});

export const AddFilterReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
    channelId: Validations.snowflakeId,
  }),
  body: z.object({
    type: z.enum(['keyword', 'mention', 'author', 'regex']),
    mode: z.enum(['include', 'exclude']),
    value: z.string().min(1).max(200),
  }),
});

export const RemoveFilterReqSchema = z.object({
  params: z.object({
    guildId: Validations.snowflakeId,
    channelId: Validations.snowflakeId,
    filterId: z.string(),
  }),
});
