import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import { handleServiceResponse, validateRequest } from 'utils/httpHandlers.js';
import { CrosspostReqSchema } from 'utils/validations.js';

export const Crosspost: Router = (() => {
  const router = express.Router();

  /**
   * Crosspost a message to a channel
   */
  router.post(
    '/:channelId/:messageId',
    validateRequest(CrosspostReqSchema),
    async (req: Request, res: Response) => {
      const { messageId, channelId } = req.params;

      // Parameters are validated by middleware, safe to use as strings
      const serviceResponse = await Services.Crosspost.Handler.push(
        channelId as string,
        messageId as string
      );

      handleServiceResponse(serviceResponse, res);
    }
  );

  return router;
})();
