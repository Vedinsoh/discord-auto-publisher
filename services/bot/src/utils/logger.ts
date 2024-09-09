import { pino } from 'pino';
import { env } from '#utils/config';

export const createLogger = (pid?: string) => {
  return pino({
    level: env.LOGGER_LEVEL ?? 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
      },
    },
    base: {
      pid,
    },
  });
};

export const logger = createLogger();
