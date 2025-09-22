import { type LoggerOptions, levels, type Logger as PinoLogger, pino } from 'pino';

export interface LoggerConfig {
  name: string;
  level?: string;
  pid?: string;
  prettyPrint?: boolean;
}

/**
 * Creates a standardized logger instance
 * @param config Logger configuration
 * @returns Pino logger instance
 */
export const createLogger = (config: LoggerConfig): PinoLogger => {
  const { name, level = 'info', pid, prettyPrint = false } = config;

  const options: LoggerOptions = {
    name,
    level,
  };

  if (pid) {
    options.base = { pid };
  }

  if (prettyPrint) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'UTC:yyyy-mm-dd HH:MM:ss.l o',
      },
    };
  }

  return pino(options);
};

/**
 * Creates a logger for REST services
 * @param level Log level
 * @returns Pino logger instance
 */
export const createRestLogger = (level = 'info'): PinoLogger => {
  return createLogger({
    name: 'REST',
    level,
  });
};

/**
 * Creates a logger for Bot services
 * @param level Log level
 * @param pid Process/cluster ID
 * @returns Pino logger instance
 */
export const createBotLogger = (level = 'info', pid?: string): PinoLogger => {
  const config: LoggerConfig = {
    name: 'BOT',
    level,
    prettyPrint: true,
  };

  if (pid) {
    config.pid = pid;
  }

  return createLogger(config);
};

export const loggerLevels = Object.values(levels.labels);
export type { PinoLogger as Logger };
