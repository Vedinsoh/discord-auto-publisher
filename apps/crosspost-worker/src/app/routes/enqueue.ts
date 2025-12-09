import { type APIResponse, StatusCodes, sendErrorResponse, validateRequest } from '@ap/express';
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

      try {
        await Services.Crosspost.Handler.push(channelId as string, messageId as string);
        res.status(StatusCodes.OK).json({
          status: StatusCodes.OK,
          data: { pushed: true },
          message: 'Message enqueued successfully',
        } as APIResponse);
      } catch (error) {
        sendErrorResponse(res, error, 'Error pushing message to crosspost queue');
      }
    }
  );

  return router;
})();
