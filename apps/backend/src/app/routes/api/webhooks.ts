import { type APIResponse, StatusCodes } from '@ap/express';
import { Keys } from '@ap/redis';
import { EventName } from '@paddle/paddle-node-sdk';
import { Data } from 'data/index.js';
import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import { unmarshalWebhook } from 'services/paddle.js';
import type { PaddleSubscriptionState } from 'services/subscriptions.js';
import { logger } from 'utils/logger.js';

const IDEMPOTENCY_TTL = 86_400; // 24 hours

const isEventProcessed = async (eventId: string): Promise<boolean> => {
  const exists = await Data.Drivers.Redis.PaddleWebhookDedupe.exists(
    `${Keys.PaddleEvent}:${eventId}`
  );
  return exists === 1;
};

const markEventProcessed = async (eventId: string): Promise<void> => {
  await Data.Drivers.Redis.PaddleWebhookDedupe.set(
    `${Keys.PaddleEvent}:${eventId}`,
    '1',
    'EX',
    IDEMPOTENCY_TTL
  );
};

const SUBSCRIPTION_EVENTS = new Set<string>([
  EventName.SubscriptionCreated,
  EventName.SubscriptionActivated,
  EventName.SubscriptionTrialing,
  EventName.SubscriptionUpdated,
  EventName.SubscriptionPastDue,
  EventName.SubscriptionPaused,
  EventName.SubscriptionResumed,
  EventName.SubscriptionCanceled,
]);

export const Webhooks: Router = (() => {
  const router = express.Router({ mergeParams: true });

  /**
   * POST /webhooks/paddle
   * Receives Paddle webhook events (raw body, signature-verified)
   */
  router.post('/', async (req: Request, res: Response) => {
    const signature = req.headers['paddle-signature'];

    if (!signature || typeof signature !== 'string') {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        message: 'Missing Paddle-Signature header',
      } as APIResponse);
      return;
    }

    if (!req.body || !Buffer.isBuffer(req.body)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        message: 'Missing or invalid request body',
      } as APIResponse);
      return;
    }

    let event: Awaited<ReturnType<typeof unmarshalWebhook>>;

    try {
      event = await unmarshalWebhook(req.body.toString('utf8'), signature);
    } catch (error) {
      logger.error(error, 'Paddle webhook signature verification failed');
      res.status(StatusCodes.UNAUTHORIZED).json({
        status: StatusCodes.UNAUTHORIZED,
        message: 'Invalid webhook signature',
      } as APIResponse);
      return;
    }

    logger.info(`Paddle webhook: ${event.eventType} (${event.eventId})`);

    if (await isEventProcessed(event.eventId)) {
      logger.debug(`Paddle event ${event.eventId} already processed, skipping`);
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: 'Event already processed',
      } as APIResponse);
      return;
    }

    try {
      if (SUBSCRIPTION_EVENTS.has(event.eventType)) {
        await handleSubscriptionEvent(event.data as PaddleSubscriptionState);
      } else {
        logger.debug(`Unhandled Paddle event: ${event.eventType}`);
      }

      await markEventProcessed(event.eventId);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: 'Webhook processed',
      } as APIResponse);
    } catch (error) {
      logger.error(error, 'Paddle webhook processing failed');
      // Non-2xx makes Paddle retry the delivery (idempotency key not yet marked)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Webhook processing failed',
      } as APIResponse);
    }
  });

  return router;
})();

async function handleSubscriptionEvent(sub: PaddleSubscriptionState): Promise<void> {
  const { previous, current, skipped } = await Services.Subscriptions.applyPaddleSubscription(sub);

  if (skipped) return;

  // Entitled → not-entitled: premium bot leaves the guild immediately
  await Services.Entitlements.enforceTransition(previous, current);
}
