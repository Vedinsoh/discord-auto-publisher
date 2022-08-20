import createLogger from 'pino';
import config from '#config';

export default createLogger({
  level: config.loggingLevel ?? 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
  base: undefined,
  timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
});
