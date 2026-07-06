import { type APIResponse, StatusCodes, validateRequest } from '@ap/express';
import { isGuildReconcileInFlight, runGuildReconcile } from 'cron/guildReconcile.js';
import express, { type Router } from 'express';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';
import { GuildReqSchema } from 'utils/validations.js';

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

  return router;
})();
