import { z } from 'zod';

export const RegExPatterns = {
  snowflake: /^(?<id>\d{17,20})$/,
};

export const Validations = {
  snowflakeId: z.string().refine(
    (value: string) => RegExPatterns.snowflake.test(value),
    {
      message: 'Invalid snowflake ID',
    }
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

export const EnqueueReqSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
    messageId: Validations.snowflakeId,
  }),
});
