import { levels } from 'pino';
import z from 'zod';

const pinoLevels = Object.values(levels.labels);

const isValidLevel = (value: string) => pinoLevels.includes(value);

const LoggerLevel = z.string().refine(isValidLevel, (value) => ({
  message: `${value} is not a valid logging level. Valid levels: ${pinoLevels.join(', ')}`,
}));

export default LoggerLevel;
