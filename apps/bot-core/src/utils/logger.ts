import { createBotLogger } from '@ap/logger';
import { env } from 'lib/config/env.js';

export const createLogger = (pid?: string) => {
  return createBotLogger(env.LOGGER_LEVEL ?? 'info', pid);
};

export const logger = createLogger();
