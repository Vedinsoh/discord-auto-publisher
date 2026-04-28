import pino from 'pino';
import { env } from './config.js';

export const logger = pino({
  level: env.LOGGER_LEVEL,
  base: { service: 'discord-proxy' },
});
