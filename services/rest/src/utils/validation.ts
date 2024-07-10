import { z } from 'zod';

export const RegExPatterns = {
  snowflake: /^[0-9]{17,19}$/,
};

export const Validations = {
  snowflakeId: z.string().refine(
    (value: string) => RegExPatterns.snowflake.test(value),
    (value) => ({
      message: `${value} is not a valid snowflake ID`,
    })
  ),
};

export const CrosspostRequestSchema = z.object({
  params: z.object({
    channelId: Validations.snowflakeId,
    messageId: Validations.snowflakeId,
  }),
});
