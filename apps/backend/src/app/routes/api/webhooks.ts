import { type APIResponse, StatusCodes } from '@ap/express';
import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

type WebhookCustomData = {
  guildId?: string;
  discordUserId?: string;
};

export const Webhooks: Router = (() => {
  const router = express.Router({ mergeParams: true });

  /**
   * POST /webhooks/paddle
   * Receives Paddle webhook events (raw body, signature-verified)
   */
  router.post('/', async (req: Request, res: Response) => {
    const signature = req.headers['paddle-signature'] as string;

    if (!signature) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        message: 'Missing paddle-signature header',
      } as APIResponse);
      return;
    }

    const rawBody = req.body?.toString('utf8');

    if (!rawBody) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        message: 'Missing request body',
      } as APIResponse);
      return;
    }

    try {
      const event = await Services.Paddle.unmarshalWebhook(rawBody, signature);

      logger.info(`Paddle webhook: ${event.eventType} (${event.eventId})`);

      const { EventName } = Services.Paddle;

      switch (event.eventType) {
        case EventName.SubscriptionCreated: {
          const data = event.data as {
            id: string;
            customerId: string;
            status: string;
            customData?: WebhookCustomData;
            items?: Array<{ price?: { id?: string; productId?: string } }>;
            currentBillingPeriod?: { endsAt?: string };
          };
          const customData = data.customData;

          if (!customData?.guildId || !customData?.discordUserId) {
            logger.warn('subscription.created missing customData fields');
            break;
          }

          await Services.Subscriptions.create({
            guildId: customData.guildId,
            paddleSubscriptionId: data.id,
            paddleCustomerId: data.customerId,
            subscriberDiscordUserId: customData.discordUserId,
            status: data.status,
            paddleProductId: data.items?.[0]?.price?.productId,
            paddlePriceId: data.items?.[0]?.price?.id,
            currentPeriodEndsAt: data.currentBillingPeriod?.endsAt
              ? new Date(data.currentBillingPeriod.endsAt)
              : undefined,
          });

          // Upsert paddle customer mapping
          await Services.PaddleCustomers.upsert(customData.discordUserId, data.customerId);

          logger.info(`Subscription created for guild ${customData.guildId}`);
          break;
        }

        case EventName.SubscriptionUpdated: {
          const data = event.data as {
            id: string;
            status: string;
            currentBillingPeriod?: { endsAt?: string };
          };

          await Services.Subscriptions.update(data.id, {
            status: data.status,
            currentPeriodEndsAt: data.currentBillingPeriod?.endsAt
              ? new Date(data.currentBillingPeriod.endsAt)
              : undefined,
          });

          logger.info(`Subscription ${data.id} updated to ${data.status}`);
          break;
        }

        case EventName.SubscriptionCanceled: {
          const data = event.data as { id: string; canceledAt?: string };

          await Services.Subscriptions.update(data.id, {
            status: 'cancelled',
            cancelledAt: data.canceledAt ? new Date(data.canceledAt) : new Date(),
          });

          logger.info(`Subscription ${data.id} cancelled`);
          break;
        }

        case EventName.SubscriptionPaused: {
          const data = event.data as { id: string };

          await Services.Subscriptions.update(data.id, {
            status: 'paused',
          });

          logger.info(`Subscription ${data.id} paused`);
          break;
        }

        case EventName.SubscriptionResumed: {
          const data = event.data as { id: string };

          await Services.Subscriptions.update(data.id, {
            status: 'active',
          });

          logger.info(`Subscription ${data.id} resumed`);
          break;
        }

        case EventName.TransactionCompleted: {
          const data = event.data as {
            id: string;
            subscriptionId?: string;
            customerId?: string;
            customData?: WebhookCustomData;
          };

          if (data.subscriptionId) {
            await Services.Subscriptions.update(data.subscriptionId, {
              status: 'active',
            });
          }

          // Upsert customer mapping if available
          if (data.customData?.discordUserId && data.customerId) {
            await Services.PaddleCustomers.upsert(data.customData.discordUserId, data.customerId);
          }

          logger.info(`Transaction ${data.id} completed`);
          break;
        }

        case EventName.TransactionPaymentFailed: {
          const data = event.data as { id: string; subscriptionId?: string };

          if (data.subscriptionId) {
            await Services.Subscriptions.update(data.subscriptionId, {
              status: 'past_due',
            });
          }

          logger.warn(`Payment failed for transaction ${data.id}`);
          break;
        }

        default:
          logger.debug(`Unhandled Paddle event: ${event.eventType}`);
      }

      // Always acknowledge receipt
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: 'Webhook processed',
      } as APIResponse);
    } catch (error) {
      logger.error(error, 'Paddle webhook processing failed');
      // Return 200 to prevent Paddle retries on signature/processing errors
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        message: 'Webhook received',
      } as APIResponse);
    }
  });

  return router;
})();
