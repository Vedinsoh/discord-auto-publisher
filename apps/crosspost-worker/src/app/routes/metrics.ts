import { handleServiceResponse } from '@ap/express';
import express, { type Response, type Router } from 'express';
import { Services } from 'services/index.js';

export const Metrics: Router = (() => {
  const router = express.Router();

  /**
   * Get queue metrics
   */
  router.get('/', async (_, res: Response) => {
    const serviceResponse = await Services.Metrics.get();

    handleServiceResponse(serviceResponse, res);
  });

  return router;
})();
