import express, { Response, Router } from 'express';

import { Services } from '@/services';
import { handleServiceResponse } from '@/utils/httpHandlers';

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
