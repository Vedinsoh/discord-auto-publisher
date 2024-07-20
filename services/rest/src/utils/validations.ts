import { z } from 'zod';

export const RegExPatterns = {
  snowflake: /^(?<id>\d{17,20})$/,
};

export const Validations = {
  snowflakeId: z.string().refine(
    (value: string) => RegExPatterns.snowflake.test(value),
    (value) => ({
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
