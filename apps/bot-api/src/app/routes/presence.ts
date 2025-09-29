import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import { handleServiceResponse, validateRequest } from 'utils/httpHandlers.js';
import { PresenceReqSchema } from 'utils/validations.js';

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
    const serviceResponse = await Services.Presence.getCount(appId as string);

    handleServiceResponse(serviceResponse, res);
  });

  /**
   * Update count of the bot client
   */
  router.put('/:appId', validateRequest(PresenceReqSchema), async (req: Request, res: Response) => {
    const { appId } = req.params;
    const { count } = req.body;

    const serviceResponse = await Services.Presence.updateCount(appId as string, count);

    handleServiceResponse(serviceResponse, res);
  });

  return router;
})();
