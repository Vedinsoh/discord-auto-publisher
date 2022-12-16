import z from 'zod';
import LoggerLevel from '#schemas/LoggerLevel';
import Snowflake from '#schemas/Snowflake';

const ConfigSchema = z
  .object({
    botAdmin: Snowflake,
    loggingLevel: LoggerLevel,
    stringLocale: z.string(),
    presenceInterval: z.number().min(1).max(60),
    urlDetection: z.object({
      enabled: z.boolean(),
      deferTimeout: z.number().min(1).max(60),
    }),
    antiSpam: z.object({
      enabled: z.boolean(),
      autoLeave: z.boolean(),
      messagesThreshold: z.number().min(0),
    }),
  })
  .strict();

export default ConfigSchema;
