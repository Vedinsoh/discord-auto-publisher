import createLogger, { levels } from 'pino';
import { loggingLevel } from '#config';

const pinoLevels = Object.values(levels.labels);
if (!pinoLevels.includes(loggingLevel)) {
  throw new Error(`Invalid logging level in config. Valid levels: ${pinoLevels.join(', ')}`);
}

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
