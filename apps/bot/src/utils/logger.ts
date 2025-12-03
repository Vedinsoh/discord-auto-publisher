import { createLogger as createBaseLogger } from '@ap/logger';

export const createLogger = (pid?: string) => {
  return createBaseLogger('BOT', pid);
};

export const logger = createLogger();
