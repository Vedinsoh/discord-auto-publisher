import { createRestLogger } from '@ap/logger';
import { env } from 'lib/config/env.js';

const Logger = createRestLogger(env.LOGGER_LEVEL);

export { Logger };
