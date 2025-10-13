import { logger } from 'utils/logger.js';

process.on('unhandledRejection', ({ stack }: Error) => logger.error(stack));
