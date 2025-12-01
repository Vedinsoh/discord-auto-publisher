import type { Snowflake } from 'discord-api-types/globals';
import { Services } from 'services/index.js';

const BOT_API_BASE = 'http://api:8080';

/**
 * Notifies api to cleanup a channel (remove from DB/cache)
 * Called when permission errors or channel deletion detected
 * @param channelId ID of the channel to cleanup
 */
const cleanupChannel = async (channelId: Snowflake) => {
  try {
    const response = await fetch(`${BOT_API_BASE}/channel/${channelId}/cleanup`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      Services.Logger.error(
        `Failed to cleanup channel ${channelId}: ${response.status} ${response.statusText}`
      );
    }

    return response.ok;
  } catch (error) {
    Services.Logger.error(`Error calling api cleanup for channel ${channelId}:`, error);
    return false;
  }
};

export const BotApi = {
  cleanupChannel,
};
