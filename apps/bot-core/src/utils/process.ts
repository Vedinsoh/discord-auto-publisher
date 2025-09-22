import { logger } from './logger.js';

process.on('unhandledRejection', ({ stack }: Error) => logger.error(stack));
