import { pino } from 'pino';

const logger = pino({ name: 'REST' });

export { logger };
