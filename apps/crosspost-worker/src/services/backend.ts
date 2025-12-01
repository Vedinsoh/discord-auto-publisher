import type { Snowflake } from 'discord-api-types/globals';
import { Services } from 'services/index.js';

const BACKEND_URL = 'http://backend:8080';

const cleanupChannel = async (channelId: Snowflake) => {
  try {
    const response = await fetch(`${BACKEND_URL}/channel/${channelId}`, {
      method: 'DELETE',
    });
    Services.Logger.debug(`Cleanup channel ${channelId} from backend, status: ${response.status}`);
  } catch (error) {
    Services.Logger.error(error);
  }
};

export const Backend = { cleanupChannel };
