import { pino } from 'pino';

const Logger = pino({ name: 'REST' });

export { Logger };
