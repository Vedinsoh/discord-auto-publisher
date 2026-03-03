import { type APIResponse, StatusCodes, sendErrorResponse } from '@ap/express';
import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';

export const SubscriptionStatus: Router = (() => {
  const router = express.Router({ mergeParams: true });

  /**
   * GET /api/internal/guild/:guildId/subscription-status
   * Docker-internal only (called by premium bot). No auth.
   */
  router.get('/guild/:guildId/subscription-status', async (req: Request, res: Response) => {
    const { guildId } = req.params;

    try {
      const active = await Services.Subscriptions.isActive(guildId as string);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: { active },
        message: 'Subscription status retrieved',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to check subscription status');
    }
  });

  return router;
})();
