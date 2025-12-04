import { handleServiceResponse, validateRequest } from '@ap/express';
import express, { type Request, type Response, type Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Services } from 'services/index.js';
import {
  AddFilterReqSchema,
  ChannelReqSchema,
  FilterReqSchema,
  RemoveFilterReqSchema,
  UpdateFilterReqSchema,
} from 'utils/validations.js';

export const Channel: Router = (() => {
  const router = express.Router();

  /**
   * Checks if a specific channel is enabled for auto-publishing
   * Returns channel status with filters
   */
  router.get(
    '/:guildId/:channelId',
    validateRequest(ChannelReqSchema),
    async (req: Request, res: Response) => {
      const { channelId } = req.params;

      const channelData = await Services.Channels.Handler.get(channelId as string);

      if (channelData) {
        res.status(StatusCodes.OK).json({
          enabled: true,
          channelId,
          filters: channelData.filters || [],
        });
      } else {
        res.status(StatusCodes.OK).json({
          enabled: false,
        });
      }
    }
  );

  /**
   * Enables auto-publishing in a specific channel
   * Adds the channel to the Redis cache and stores it in DB
   */
  router.put(
    '/:guildId/:channelId',
    validateRequest(ChannelReqSchema),
    async (req: Request, res: Response) => {
      const { guildId, channelId } = req.params;

      const serviceResponse = await Services.Channels.Handler.add(
        guildId as string,
        channelId as string
      );

      handleServiceResponse(serviceResponse, res);
    }
  );

  /**
   * Disables auto-publishing in a specific channel
   * Removes the channel from the Redis cache and DB
   */
  router.delete(
    '/:guildId/:channelId',
    validateRequest(ChannelReqSchema),
    async (req: Request, res: Response) => {
      const { channelId } = req.params;

      const serviceResponse = await Services.Channels.Handler.remove(channelId as string);

      handleServiceResponse(serviceResponse, res);
    }
  );

  /**
   * Add filter to channel
   */
  router.post(
    '/:guildId/:channelId/filters',
    validateRequest(AddFilterReqSchema),
    async (req: Request, res: Response) => {
      const { guildId, channelId } = req.params;
      const filterData = req.body;

      const serviceResponse = await Services.Filters.Handler.add(
        guildId as string,
        channelId as string,
        filterData
      );

      handleServiceResponse(serviceResponse, res);
    }
  );

  /**
   * Remove filter from channel
   */
  router.delete(
    '/:guildId/:channelId/filters/:filterId',
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

  /**
   * Get filters for channel
   */
  router.get(
    '/:guildId/:channelId/filters',
    validateRequest(FilterReqSchema),
    async (req: Request, res: Response) => {
      const { channelId } = req.params;

      const serviceResponse = await Services.Filters.Handler.list(channelId as string);

      handleServiceResponse(serviceResponse, res);
    }
  );

  /**
   * Update filter in channel
   */
  router.put(
    '/:guildId/:channelId/filters/:filterId',
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
   * Cleanup endpoint for crosspost-worker
   * Removes channel from cache and DB when permission errors occur
   */
  router.delete('/:channelId/cleanup', async (req: Request, res: Response) => {
    const { channelId } = req.params;

    await Services.Channels.DB.remove(channelId as string);

    res.status(StatusCodes.NO_CONTENT).send();
  });

  return router;
})();
