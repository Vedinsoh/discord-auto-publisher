import express, { Request, Response, Router } from 'express';

import { Services } from '@/services';
import { handleServiceResponse, validateRequest } from '@/utils/httpHandlers';
import { CrosspostReqSchema } from '@/utils/validations';

export const Crosspost: Router = (() => {
  const router = express.Router();

  /**
   * Crosspost a message to a channel
   */
  router.post('/:channelId/:messageId', validateRequest(CrosspostReqSchema), async (req: Request, res: Response) => {
    const { messageId, channelId } = req.params;

    const serviceResponse = await Services.Crosspost.Handler.push(channelId, messageId);

    handleServiceResponse(serviceResponse, res);
  });

  return router;
})();
