import {
  type APIResponse,
  requirePremium,
  StatusCodes,
  sendErrorResponse,
  validateRequest,
} from '@ap/express';
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

  // All filter routes require premium
  router.use(requirePremium);

  /**
   * Get filters for channel
   */
  router.get('/', validateRequest(FilterReqSchema), async (req: Request, res: Response) => {
    const { channelId } = req.params;

    try {
      const filters = await Services.Channels.Filters.list(channelId as string);
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: { filters },
        message: 'Filters retrieved successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to get filters');
    }
  });

  /**
   * Add filter to channel
   */
  router.post('/', validateRequest(AddFilterReqSchema), async (req: Request, res: Response) => {
    const { channelId } = req.params;
    const filterData = req.body;

    try {
      const filter = await Services.Channels.Filters.add(channelId as string, filterData);
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: { success: true, filter },
        message: 'Filter added successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to add filter');
    }
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

      try {
        await Services.Channels.Filters.update(channelId as string, filterId as string, filterData);
        res.status(StatusCodes.OK).json({
          status: StatusCodes.OK,
          data: { success: true },
          message: 'Filter updated successfully',
        } as APIResponse);
      } catch (error) {
        sendErrorResponse(res, error, 'Failed to update filter');
      }
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

      try {
        await Services.Channels.Filters.remove(channelId as string, filterId as string);
        res.status(StatusCodes.OK).json({
          status: StatusCodes.OK,
          data: { success: true },
          message: 'Filter removed successfully',
        } as APIResponse);
      } catch (error) {
        sendErrorResponse(res, error, 'Failed to remove filter');
      }
    }
  );

  return router;
})();
