import 'dotenv/config';
import { cleanEnv, num, port, str, url } from 'envalid';
import { levels as loggerLevels } from 'pino';

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ default: 'development', choices: ['development', 'production', 'test'] }),
  LOGGER_LEVEL: str({ default: 'info', choices: Object.values(loggerLevels.labels) }),
  REDIS_URI: url({ default: 'redis://rest-cache:6379' }),
  DISCORD_TOKEN: str(),
  PORT: port({ default: 8080 }),
  REDIS_TIMEOUT_MS: num({ default: 200 }),
});
