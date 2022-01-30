import createLogger from 'pino';
import { loggingLevel } from '#config';

export default createLogger({
  level: loggingLevel ?? 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
  base: undefined,
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
});
