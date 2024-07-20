import express, { Request, Response, Router } from 'express';

import { Services } from '@/services';
import { handleServiceResponse, validateRequest } from '@/utils/httpHandlers';
import { CrosspostReqSchema } from '@/utils/validations';

export const Crosspost: Router = (() => {
  const router = express.Router();

  router.post('/:channelId/:messageId', validateRequest(CrosspostReqSchema), async (req: Request, res: Response) => {
    const { messageId, channelId } = req.params;

    const serviceResponse = await Services.Crosspost.push(channelId, messageId);

    handleServiceResponse(serviceResponse, res);
  });

  // TODO for deleting from crosspost queue
  // router.delete('/:id', validateRequest(Validations.snowflakeId), async (req: Request, res: Response) => {
  //   const messageId = req.params.id;
  //   const serviceResponse = await Services.Crosspost.findById(messageId);
  //   handleServiceResponse(serviceResponse, res);
  // });

  return router;
})();
