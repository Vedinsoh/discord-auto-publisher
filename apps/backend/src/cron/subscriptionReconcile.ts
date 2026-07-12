import { CronJob } from 'cron';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';
import { guardMassAction } from 'utils/massActionGuard.js';

/**
 * Daily cron: reconciles local subscription state against the Paddle API.
 * Backstop for missed webhooks — Paddle owns period-end cancellation, so no
 * local expiry scanning is needed. Entitlement transitions detected here are
 * enforced the same way as webhook-driven ones (premium bot leaves the guild).
 */
let inFlight = false;

export const isSubscriptionReconcileInFlight = () => inFlight;

const reconcileSubscriptions = async () => {
  let processed = 0;
  let changed = 0;
  const toRevoke = new Set<string>();

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

    // Collect rather than leave inline — counting revocations across the whole
    // pass lets the circuit breaker below catch a Paddle mass-cancel snapshot
    // before a single bot leaves.
    if (Services.Entitlements.isRevocation(previous, current)) toRevoke.add(current.guildId);
  }

  // Backstop for missed/failed revocations: bot still present in a guild whose
  // subscription is already not entitled (no transition seen this pass).
  for (const sub of await Services.Subscriptions.getRevokedWithBotPresent()) {
    toRevoke.add(sub.guildId);
  }

  // Only guilds the premium bot is actually in can be left; scope the count and
  // the cap's population to premium presence so normal churn of already-departed
  // lapses can't trip (or dodge) the breaker.
  const present = await Services.Editions.filterPresent([...toRevoke], 'premium');
  const population = await Services.Editions.countPresent('premium');

  let revoked = 0;
  const allowed = guardMassAction({
    key: 'subscription-reconcile-revocation-cap',
    action: 'revoke premium access',
    count: present.length,
    population,
    context:
      'Paddle may have reported a bad subscription snapshot — investigate before re-running.',
  });

  if (allowed) {
    for (const guildId of present) {
      logger.info(`Reconcile: enforcing revocation for guild ${guildId}`);
      await Services.Entitlements.revokePremiumAccess(guildId);
      revoked++;
    }
  }

  logger.info(
    `Subscription reconcile finished: ${processed} checked, ${changed} corrected, ${revoked} revoked`
  );
};

export const runSubscriptionReconcile = async (): Promise<void> => {
  if (inFlight) {
    logger.warn('Subscription reconcile already in flight, skipping');
    return;
  }

  inFlight = true;
  try {
    await reconcileSubscriptions();
  } catch (error) {
    logger.error(error, 'Subscription reconcile failed');
  } finally {
    inFlight = false;
  }
};

export const startSubscriptionReconcile = () => {
  const job = new CronJob('0 4 * * *', runSubscriptionReconcile);
  job.start();
  logger.info('Subscription reconcile cron started (daily at 04:00)');
};
