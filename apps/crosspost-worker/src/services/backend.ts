import type { Snowflake } from 'discord-api-types/globals';
import { logger } from 'utils/logger.js';

const BACKEND_URL = 'http://backend:8080';

const cleanupChannel = async (channelId: Snowflake) => {
  try {
    const response = await fetch(`${BACKEND_URL}/channel/${channelId}`, {
      method: 'DELETE',
    });
    logger.debug(`Cleanup channel ${channelId} from backend, status: ${response.status}`);
  } catch (error) {
    logger.error(error);
  }
};

export const Backend = { cleanupChannel };
