import { pino } from 'pino';

import { env } from '@/utils/config';

const Logger = pino({ name: 'REST', level: env.LOGGER_LEVEL });

export { Logger };
