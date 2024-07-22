import z from 'zod';
import LoggerLevel from '#schemas/config/LoggerLevel';
import Snowflake from '#schemas/config/Snowflake';

export const BotConfigSchema = z
  .object({
    presenceInterval: z.number().min(1).max(60),
    urlDetection: z.object({
      enabled: z.boolean(),
      deferTimeout: z.number().min(1).max(60),
    }),
  })
  .strict();

export const EnvSchema = z
  .object({
    discordToken: z.string(),
    redisUri: z.string().url(),
    restHost: z.string(),
    restPort: z.string(),

    botAdmins: z.array(Snowflake),
    shards: z.number().min(1),
    shardsPerCluster: z.number().min(1),
    loggerLevel: LoggerLevel,
  })
  .strict();

export const ConfigSchema = BotConfigSchema.merge(EnvSchema);
