import { handleServiceResponse, validateRequest } from '@ap/express';
import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import { EnqueueReqSchema } from 'utils/validations.js';

export const Enqueue: Router = (() => {
  const router = express.Router();

  /**
   * Enqueue a message for crossposting
   */
  router.post(
    '/:channelId/:messageId',
    validateRequest(EnqueueReqSchema),
    async (req: Request, res: Response) => {
      const { channelId, messageId } = req.params;

      const serviceResponse = await Services.Crosspost.Handler.push(
        channelId as string,
        messageId as string
      );

      handleServiceResponse(serviceResponse, res);
    }
  );

  return router;
})();
