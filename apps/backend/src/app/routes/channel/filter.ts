import { handleServiceResponse, validateRequest } from '@ap/express';
import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import {
  AddFilterReqSchema,
  FilterReqSchema,
  RemoveFilterReqSchema,
  UpdateFilterReqSchema,
} from 'utils/validations.js';

export const Filter: Router = (() => {
  const router = express.Router({ mergeParams: true });

  /**
   * Add filter to channel
   */
  router.post('/', validateRequest(AddFilterReqSchema), async (req: Request, res: Response) => {
    const { channelId } = req.params;
    const filterData = req.body;

    const serviceResponse = await Services.Filters.Handler.add(channelId as string, filterData);

    handleServiceResponse(serviceResponse, res);
  });

  /**
   * Get filters for channel
   */
  router.get('/', validateRequest(FilterReqSchema), async (req: Request, res: Response) => {
    const { channelId } = req.params;

    const serviceResponse = await Services.Filters.Handler.list(channelId as string);

    handleServiceResponse(serviceResponse, res);
  });

  /**
   * Update filter in channel
   */
  router.put(
    '/:filterId',
    validateRequest(UpdateFilterReqSchema),
    async (req: Request, res: Response) => {
      const { channelId, filterId } = req.params;
      const filterData = req.body;

      const serviceResponse = await Services.Filters.Handler.update(
        channelId as string,
        filterId as string,
        filterData
      );

      handleServiceResponse(serviceResponse, res);
    }
  );

  /**
   * Remove filter from channel
   */
  router.delete(
    '/:filterId',
    validateRequest(RemoveFilterReqSchema),
    async (req: Request, res: Response) => {
      const { channelId, filterId } = req.params;

      const serviceResponse = await Services.Filters.Handler.remove(
        channelId as string,
        filterId as string
      );

      handleServiceResponse(serviceResponse, res);
    }
  );

  return router;
})();
