import express, { Request, Response, Router } from 'express';

import { Services } from '@/services';
import { handleServiceResponse, validateRequest } from '@/utils/httpHandlers';
import { PresenceReqSchema } from '@/utils/validations';

export const Presence: Router = (() => {
  const router = express.Router();

  /**
   * Get total count of all bot clients
   */
  router.get('/', async (_, res: Response) => {
    const serviceResponse = await Services.Presence.getTotalCount();

    handleServiceResponse(serviceResponse, res);
  });

  /**
   * Get count of the bot client
   */
  router.get('/:appId', async (req: Request, res: Response) => {
    const { appId } = req.params;
    const serviceResponse = await Services.Presence.getCount(appId);

    handleServiceResponse(serviceResponse, res);
  });

  /**
   * Update count of the bot client
   */
  router.put('/:appId', validateRequest(PresenceReqSchema), async (req: Request, res: Response) => {
    const { appId } = req.params;
    const { count } = req.body;

    const serviceResponse = await Services.Presence.updateCount(appId, count);

    handleServiceResponse(serviceResponse, res);
  });

  return router;
})();
