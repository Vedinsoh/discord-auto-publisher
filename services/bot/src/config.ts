import 'dotenv/config';
import fs from 'node:fs';
import type z from 'zod';
import type { BotConfigSchema, EnvSchema } from '#schemas/config/ConfigSchema';
import validateConfig from '#util/validateConfig';

const botConfigFile = fs.readFileSync(`./config.json`, 'utf8');
const botConfig = JSON.parse(botConfigFile) as z.infer<typeof BotConfigSchema>;

const envVars: z.infer<typeof EnvSchema> = {
  discordToken: process.env.DISCORD_TOKEN,
  mongoUri: process.env.MONGO_URI,
  redisUri: process.env.REDIS_URI,
  restHost: process.env.REST_HOST,
  restPort: process.env.REST_PORT,

  botAdmins: process.env.BOT_ADMINS.split(/,\s*/g),
  shards: parseInt(process.env.BOT_SHARDS),
  shardsPerCluster: parseInt(process.env.BOT_SHARDS_PER_CLUSTER),
  // loggerLevel: process.env.LOGGER_LEVEL, // TODO
  loggerLevel: 'info',
};

const config = { ...botConfig, ...envVars };
validateConfig(config);

export default config;
