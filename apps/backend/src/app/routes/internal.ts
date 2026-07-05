import { type APIResponse, StatusCodes } from '@ap/express';
import { isGuildReconcileInFlight, runGuildReconcile } from 'cron/guildReconcile.js';
import express, { type Router } from 'express';

export const Internal: Router = (() => {
  const router = express.Router();

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
