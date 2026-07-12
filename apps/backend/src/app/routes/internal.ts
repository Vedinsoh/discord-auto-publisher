import { type APIResponse, StatusCodes, validateRequest } from '@ap/express';
import { isGuildReconcileInFlight, runGuildReconcile } from 'cron/guildReconcile.js';
import {
  isSubscriptionReconcileInFlight,
  runSubscriptionReconcile,
} from 'cron/subscriptionReconcile.js';
import express, { type Router } from 'express';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';
import { GuildReqSchema, PublishStatePushReqSchema } from 'utils/validations.js';

export const Internal: Router = (() => {
  const router = express.Router();

  /**
   * POST /internal/handover/:guildId/evaluate
   * Permission-change ping from the premium bot while a handover is pending
   * (Docker-internal). Evaluation runs async — 202 immediately; a no-op when
   * the guild is not pending.
   */
  router.post('/handover/:guildId/evaluate', validateRequest(GuildReqSchema), (req, res) => {
    const { guildId } = req.params;

    void Services.Handover.evaluate(guildId).catch(error =>
      logger.error(error, `Handover evaluation failed for guild ${guildId}`)
    );

    res.status(StatusCodes.ACCEPTED).json({
      status: StatusCodes.ACCEPTED,
      message: 'Handover evaluation started',
    } as APIResponse);
  });

  /**
   * POST /internal/channel-permissions/:guildId
   * Publish-state push from a bot (ADR 0008): one edition's per-channel
   * crosspost capability, computed off the bot's gateway cache. Stored for the
   * dashboard + handover gate to read. Fire-and-forget — 202 immediately.
   */
  router.post(
    '/channel-permissions/:guildId',
    validateRequest(PublishStatePushReqSchema),
    (req, res) => {
      const { guildId } = req.params;
      const { edition, full, channels } = req.body;

      void Services.PublishState.writeGuildEdition(guildId, edition, channels, !!full).catch(
        error => logger.error(error, `Publish-state write failed for guild ${guildId}`)
      );

      res.status(StatusCodes.ACCEPTED).json({
        status: StatusCodes.ACCEPTED,
        message: 'Publish-state accepted',
      } as APIResponse);
    }
  );

  /**
   * POST /internal/reconcile/guilds
   * Manually trigger the guild presence reconciliation sweep (Docker-internal).
   * 409 if a sweep is already in flight, otherwise 202 + async run.
   */
  router.post('/reconcile/guilds', (_req, res) => {
    if (isGuildReconcileInFlight()) {
      res.status(StatusCodes.CONFLICT).json({
        status: StatusCodes.CONFLICT,
        message: 'Guild reconcile already in flight',
      } as APIResponse);
      return;
    }

    void runGuildReconcile();

    res.status(StatusCodes.ACCEPTED).json({
      status: StatusCodes.ACCEPTED,
      message: 'Guild reconcile started',
    } as APIResponse);
  });

  /**
   * POST /internal/reconcile/subscriptions
   * Manually trigger the subscription reconcile against the Paddle API
   * (Docker-internal). 409 if a run is already in flight, otherwise 202 +
   * async run.
   */
  router.post('/reconcile/subscriptions', (_req, res) => {
    if (isSubscriptionReconcileInFlight()) {
      res.status(StatusCodes.CONFLICT).json({
        status: StatusCodes.CONFLICT,
        message: 'Subscription reconcile already in flight',
      } as APIResponse);
      return;
    }

    void runSubscriptionReconcile();

    res.status(StatusCodes.ACCEPTED).json({
      status: StatusCodes.ACCEPTED,
      message: 'Subscription reconcile started',
    } as APIResponse);
  });

  return router;
})();
