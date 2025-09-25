import { env } from 'lib/config/env.js';
import { pino } from 'pino';

const Logger = pino({ name: 'REST', level: env.LOGGER_LEVEL });

export { Logger };
