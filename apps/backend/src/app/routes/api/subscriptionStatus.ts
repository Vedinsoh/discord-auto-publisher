import { type APIResponse, StatusCodes, sendErrorResponse, validateRequest } from '@ap/express';
import express, { type Router } from 'express';
import { Services } from 'services/index.js';
import { GuildReqSchema } from 'utils/validations.js';

export const SubscriptionStatus: Router = (() => {
  const router = express.Router({ mergeParams: true });

  /**
   * GET /api/internal/guild/:guildId/subscription-status
   * Docker-internal only (called by premium bot). No auth.
   */
  router.get(
    '/guild/:guildId/subscription-status',
    validateRequest(GuildReqSchema),
    async (req, res) => {
      const { guildId } = req.params;

      try {
        const active = await Services.Subscriptions.isEntitled(guildId);

        res.status(StatusCodes.OK).json({
          status: StatusCodes.OK,
          data: { active },
          message: 'Subscription status retrieved',
        } as APIResponse);
      } catch (error) {
        sendErrorResponse(res, error, 'Failed to check subscription status');
      }
    }
  );

  return router;
})();
