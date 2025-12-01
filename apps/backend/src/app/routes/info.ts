import { handleServiceResponse } from '@ap/express';
import express, { type Response, type Router } from 'express';
import { Services } from 'services/index.js';

export const Info: Router = (() => {
  const router = express.Router();

  /**
   * Get messages queue data
   */
  router.get('/', async (_, res: Response) => {
    const serviceResponse = await Services.Info.get();

    handleServiceResponse(serviceResponse, res);
  });

  return router;
})();
