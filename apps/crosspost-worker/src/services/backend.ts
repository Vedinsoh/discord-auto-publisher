import type { Snowflake } from 'discord-api-types/globals';
import { logger } from 'utils/logger.js';

const BACKEND_URL = 'http://backend:8080';

const disableChannel = async (channelId: Snowflake) => {
  try {
    const response = await fetch(`${BACKEND_URL}/channel/${channelId}`, {
      method: 'DELETE',
    });
    logger.debug(`Disable channel ${channelId} on backend, status: ${response.status}`);
  } catch (error) {
    logger.error(error);
  }
};

const flagChannel = async (channelId: Snowflake) => {
  try {
    const response = await fetch(`${BACKEND_URL}/channel/${channelId}/flag`, {
      method: 'POST',
    });
    logger.debug(`Flag channel ${channelId}, status: ${response.status}`);
  } catch (error) {
    logger.error(error);
  }
};

const unflagChannel = async (channelId: Snowflake) => {
  try {
    // Fire-and-forget: don't wait for response
    fetch(`${BACKEND_URL}/channel/${channelId}/unflag`, {
      method: 'POST',
    }).catch(() => {});
  } catch {
    // Silently ignore errors for unflag (fire-and-forget)
  }
};

export const Backend = { disableChannel, flagChannel, unflagChannel };
