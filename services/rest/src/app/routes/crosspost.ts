import express, { Request, Response, Router } from 'express';

import { Services } from '@/services';
import { handleServiceResponse, validateRequest } from '@/utils/httpHandlers';
import { CrosspostRequestSchema } from '@/utils/validation';

export const Crosspost: Router = (() => {
  const router = express.Router();

  // TODO for adding to crosspost queue
  router.post(
    '/:channelId/:messageId',
    validateRequest(CrosspostRequestSchema),
    async (req: Request, res: Response) => {
      const messageId = req.params.messageId;
      const channelId = req.params.channelId;

      // TODO check if channel is flagged for spam

      const serviceResponse = await Services.Crosspost.push(channelId, messageId);

      handleServiceResponse(serviceResponse, res);
    }
  );

  // TODO for deleting from crosspost queue
  // router.delete('/:id', validateRequest(Validations.snowflakeId), async (req: Request, res: Response) => {
  //   const messageId = req.params.id;
  //   const serviceResponse = await Services.Crosspost.findById(messageId);
  //   handleServiceResponse(serviceResponse, res);
  // });

  return router;
})();
