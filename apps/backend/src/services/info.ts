import type { InfoResponse } from '@ap/express';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

/**
 * Get backend-side info — channels cache size only. Proxy stats live on the proxy's /info.
 */
const get = async (): Promise<InfoResponse> => {
  try {
    const channelsCacheSize = await Services.Channels.getSize();
    return { channelsCacheSize };
  } catch (error) {
    logger.error(error);
    throw new Error('Error getting info');
  }
};

export const Info = {
  get,
};
