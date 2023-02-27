import pino from 'pino';
import config from '#config';

export const createLogger = (pid?: string) => {
  return pino({
    level: config.loggingLevel ?? 'info',
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
