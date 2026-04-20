import { CronJob } from 'cron';
import { Routes } from 'discord-api-types/v10';
import { Discord } from 'services/discord.js';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

/**
 * Hourly cron: removes premium bot from guilds with expired subscriptions
 */
const auditExpiredSubscriptions = async () => {
  try {
    const expired = await Services.Subscriptions.getExpired();

    if (expired.length === 0) return;

    logger.info(`Subscription audit: found ${expired.length} expired subscriptions`);

    for (const sub of expired) {
      try {
        // Leave guild via Discord API (through proxy)
        await Discord.rest.delete(Routes.userGuild(sub.guildId));
        logger.info(`Left guild ${sub.guildId} (expired subscription ${sub.stripeSubscriptionId})`);
      } catch (error) {
        // Guild may already be left or bot not in guild — non-fatal
        logger.debug(error, `Could not leave guild ${sub.guildId}`);
      }

      // Mark as expired to prevent re-processing
      if (sub.stripeSubscriptionId) {
        await Services.Subscriptions.update(sub.stripeSubscriptionId, {
          status: 'expired',
        });
      }
    }
  } catch (error) {
    logger.error(error, 'Subscription audit cron failed');
  }
};

export const startSubscriptionAudit = () => {
  const job = new CronJob('0 * * * *', auditExpiredSubscriptions);
  job.start();
  logger.info('Subscription audit cron started (hourly)');
};
