import { CronJob } from 'cron';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

/**
 * Daily cron job to disable flagged channels
 * Runs at midnight UTC (00:00)
 */
export const invalidChannelsCleanup = new CronJob(
  '0 0 * * *', // Every day at 00:00 UTC
  async () => {
    const disabledChannelIds = await Services.Channels.DB.invalidCleanup();
    if (disabledChannelIds.length > 0) {
      logger.info(`Daily cleanup: disabled ${disabledChannelIds.length} expired channels`);
    }
  },
  null,
  false, // Don't start immediately
  'UTC'
);
