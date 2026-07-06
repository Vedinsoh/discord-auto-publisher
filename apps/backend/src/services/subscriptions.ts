import { botPresence, db, type Subscription, subscription } from '@ap/database';
import { and, eq, isNull, notInArray } from 'drizzle-orm';
import { alerter } from 'utils/alerts.js';
import { logger } from 'utils/logger.js';

/** Statuses that keep a guild entitled to premium (past_due rides out Paddle dunning) */
export const ENTITLED_STATUSES = ['active', 'trialing', 'past_due'] as const;

export const isEntitledStatus = (status: string): boolean =>
  (ENTITLED_STATUSES as readonly string[]).includes(status);

/**
 * Structural shape shared by the Paddle API Subscription entity and the
 * webhook SubscriptionNotification — both are accepted by applyPaddleSubscription.
 */
export type PaddleSubscriptionState = {
  id: string;
  status: string;
  customerId: string;
  updatedAt: string;
  canceledAt: string | null;
  currentBillingPeriod: { endsAt: string } | null;
  billingCycle: { interval: string } | null;
  scheduledChange: { action: string; effectiveAt: string } | null;
  items: ReadonlyArray<{ price?: { id: string } | null }>;
  customData: unknown;
};

/** Row values derived from a Paddle subscription state */
type PaddleSubscriptionValues = {
  guildId: string;
  paddleSubscriptionId: string;
  paddleCustomerId: string;
  subscriberDiscordUserId: string;
  status: string;
  paddlePriceId: string | null;
  billingInterval: string | null;
  currentPeriodEndsAt: Date | null;
  scheduledChangeAction: string | null;
  scheduledChangeAt: Date | null;
  canceledAt: Date | null;
  lastEventAt: Date;
};

const mapPaddleSubscription = (sub: PaddleSubscriptionState): PaddleSubscriptionValues | null => {
  const customData = sub.customData as {
    discord_guild_id?: string;
    discord_user_id?: string;
  } | null;
  const guildId = customData?.discord_guild_id;
  const discordUserId = customData?.discord_user_id;

  if (!guildId || !discordUserId) {
    logger.warn(
      `Paddle subscription ${sub.id} missing discord_guild_id/discord_user_id in custom_data`
    );
    return null;
  }

  return {
    guildId,
    paddleSubscriptionId: sub.id,
    paddleCustomerId: sub.customerId,
    subscriberDiscordUserId: discordUserId,
    status: sub.status,
    paddlePriceId: sub.items[0]?.price?.id ?? null,
    billingInterval: sub.billingCycle?.interval ?? null,
    currentPeriodEndsAt: sub.currentBillingPeriod?.endsAt
      ? new Date(sub.currentBillingPeriod.endsAt)
      : null,
    scheduledChangeAction: sub.scheduledChange?.action ?? null,
    scheduledChangeAt: sub.scheduledChange?.effectiveAt
      ? new Date(sub.scheduledChange.effectiveAt)
      : null,
    canceledAt: sub.canceledAt ? new Date(sub.canceledAt) : null,
    lastEventAt: new Date(sub.updatedAt),
  };
};

const getByGuildId = async (guildId: string): Promise<Subscription | undefined> => {
  try {
    const [row] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.guildId, guildId))
      .limit(1);
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve subscription by guildId');
  }
};

const getByPaddleSubscriptionId = async (
  paddleSubId: string
): Promise<Subscription | undefined> => {
  try {
    const [row] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.paddleSubscriptionId, paddleSubId))
      .limit(1);
    return row;
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve subscription by paddleSubscriptionId');
  }
};

/**
 * Applies a Paddle subscription state to the local row (webhooks + reconcile cron).
 * Returns previous/current rows so callers can detect entitlement transitions.
 * Skips input three ways (webhook deliveries are unordered):
 * - same subscription: Paddle updated_at older than the applied state
 * - same guild, different subscription, both entitled: duplicate checkout
 *   race — first subscription wins, alert fires
 * - same guild, different subscription: a lapsed subscription may not
 *   overwrite a newer entitled one (re-subscribe)
 */
const applyPaddleSubscription = async (
  sub: PaddleSubscriptionState
): Promise<{ previous?: Subscription; current?: Subscription; skipped: boolean }> => {
  const values = mapPaddleSubscription(sub);
  if (!values) return { skipped: true };

  try {
    const existingById = await getByPaddleSubscriptionId(values.paddleSubscriptionId);

    if (existingById) {
      if (values.lastEventAt < existingById.lastEventAt) {
        logger.debug(
          `Skipping out-of-order Paddle event for subscription ${values.paddleSubscriptionId}`
        );
        return { previous: existingById, current: existingById, skipped: true };
      }

      const [row] = await db
        .update(subscription)
        .set(values)
        .where(eq(subscription.paddleSubscriptionId, values.paddleSubscriptionId))
        .returning();
      return { previous: existingById, current: row, skipped: false };
    }

    const existingByGuild = await getByGuildId(values.guildId);

    if (existingByGuild) {
      // Duplicate guard: two admins completed checkout before either webhook
      // landed (the 409 checkout guard only covers transaction creation). Keep
      // the FIRST subscription and alert — support cancels+refunds the
      // duplicate in Paddle. A legitimate new subscription can only arrive
      // while the existing row is non-entitled.
      if (isEntitledStatus(existingByGuild.status) && isEntitledStatus(values.status)) {
        logger.error(
          `Duplicate entitled Paddle subscription ${values.paddleSubscriptionId} for guild ${values.guildId} (keeping ${existingByGuild.paddleSubscriptionId})`
        );
        alerter.send(`duplicate-subscription:${values.guildId}`, {
          title: 'Duplicate entitled subscription',
          description: `Guild ${values.guildId} already has entitled subscription \`${existingByGuild.paddleSubscriptionId}\`; ignored incoming \`${values.paddleSubscriptionId}\` (subscriber ${values.subscriberDiscordUserId}). Cancel + refund the duplicate in Paddle.`,
        });
        return { previous: existingByGuild, current: existingByGuild, skipped: true };
      }

      const isStale = isEntitledStatus(existingByGuild.status) && !isEntitledStatus(values.status);

      if (isStale) {
        logger.debug(
          `Skipping stale Paddle subscription ${values.paddleSubscriptionId} for guild ${values.guildId}`
        );
        return { previous: existingByGuild, current: existingByGuild, skipped: true };
      }

      const [row] = await db
        .update(subscription)
        .set(values)
        .where(eq(subscription.guildId, values.guildId))
        .returning();
      return { previous: existingByGuild, current: row, skipped: false };
    }

    const [row] = await db.insert(subscription).values(values).returning();
    logger.info(`Created subscription for guild ${values.guildId} (${values.status})`);
    return { current: row, skipped: false };
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to apply Paddle subscription');
  }
};

const isEntitled = async (guildId: string): Promise<boolean> => {
  try {
    const row = await getByGuildId(guildId);
    if (!row) return false;
    return isEntitledStatus(row.status);
  } catch (error) {
    logger.error(error);
    return false;
  }
};

/**
 * Not-entitled subscriptions whose guild still has the premium bot present
 * (active premium presence) — reconcile cron re-enforces revocation for these.
 */
const getRevokedWithBotPresent = async (): Promise<Subscription[]> => {
  try {
    const rows = await db
      .select()
      .from(subscription)
      .innerJoin(
        botPresence,
        and(
          eq(subscription.guildId, botPresence.guildId),
          eq(botPresence.edition, 'premium'),
          // leftAt set = premium bot already absent, nothing to revoke
          isNull(botPresence.leftAt)
        )
      )
      .where(notInArray(subscription.status, [...ENTITLED_STATUSES]));
    return rows.map(row => row.subscription);
  } catch (error) {
    logger.error(error);
    throw new Error('Failed to retrieve revoked subscriptions with bot present');
  }
};

export const Subscriptions = {
  getByGuildId,
  getByPaddleSubscriptionId,
  applyPaddleSubscription,
  isEntitled,
  getRevokedWithBotPresent,
};
