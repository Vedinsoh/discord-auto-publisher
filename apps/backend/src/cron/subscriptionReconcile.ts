import { CronJob } from 'cron';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

/**
 * Daily cron: reconciles local subscription state against the Paddle API.
 * Backstop for missed webhooks — Paddle owns period-end cancellation, so no
 * local expiry scanning is needed. Entitlement transitions detected here are
 * enforced the same way as webhook-driven ones (premium bot leaves the guild).
 */
const reconcileSubscriptions = async () => {
  try {
    let processed = 0;
    let changed = 0;

    for await (const paddleSub of Services.Paddle.listAllSubscriptions()) {
      processed++;

      const { previous, current, skipped } =
        await Services.Subscriptions.applyPaddleSubscription(paddleSub);

      if (skipped || !current) continue;

      if (!previous || previous.status !== current.status) {
        changed++;
        logger.info(
          `Reconcile: subscription ${current.paddleSubscriptionId} for guild ${current.guildId}: ${previous?.status ?? 'missing'} -> ${current.status}`
        );
      }

      await Services.Entitlements.enforceTransition(previous, current);
    }

    // Backstop for missed/failed revocations: bot still present in a guild
    // whose subscription is no longer entitled
    const revoked = await Services.Subscriptions.getRevokedWithBotPresent();
    for (const sub of revoked) {
      logger.info(`Reconcile: re-enforcing revocation for guild ${sub.guildId} (${sub.status})`);
      await Services.Entitlements.revokePremiumAccess(sub.guildId);
    }

    logger.info(`Subscription reconcile finished: ${processed} checked, ${changed} corrected`);
  } catch (error) {
    logger.error(error, 'Subscription reconcile cron failed');
  }
};

export const startSubscriptionReconcile = () => {
  const job = new CronJob('0 4 * * *', reconcileSubscriptions);
  job.start();
  logger.info('Subscription reconcile cron started (daily at 04:00)');
};
