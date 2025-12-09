import { type APIResponse, StatusCodes, sendErrorResponse } from '@ap/express';
import express, { type Response, type Router } from 'express';
import { Services } from 'services/index.js';

export const Metrics: Router = (() => {
  const router = express.Router();

  /**
   * Get queue metrics
   */
  router.get('/', async (_, res: Response) => {
    try {
      const data = await Services.Metrics.get();
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data,
        message: 'Metrics retrieved successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Error getting metrics');
    }
  });

  return router;
})();
