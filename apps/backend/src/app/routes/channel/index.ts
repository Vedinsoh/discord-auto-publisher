import { handleServiceResponse, validateRequest } from '@ap/express';
import express, { type Request, type Response, type Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Services } from 'services/index.js';
import { ChannelReqSchema, UpdateFilterModeReqSchema } from 'utils/validations.js';
import { Filter } from './filter.js';

export const Channel: Router = (() => {
  const router = express.Router({ mergeParams: true });

  // Mount filter subrouter at /filter
  router.use('/filter', Filter);

  /**
   * Checks if a specific channel is enabled for auto-publishing
   * Returns channel status with filters and filter mode
   */
  router.get('/', validateRequest(ChannelReqSchema), async (req: Request, res: Response) => {
    const { channelId } = req.params;

    // Get full channel data from DB (includes filterMode)
    const channelData = await Services.Channels.DB.find(channelId as string);

    if (channelData) {
      res.status(StatusCodes.OK).json({
        enabled: true,
        channelId,
        filters: channelData.filters || [],
        filterMode: channelData.filterMode || 'any',
      });
    } else {
      res.status(StatusCodes.OK).json({
        enabled: false,
      });
    }
  });

  /**
   * Enables auto-publishing in a specific channel
   * Adds the channel to the Redis cache and stores it in DB
   */
  router.put('/', validateRequest(ChannelReqSchema), async (req: Request, res: Response) => {
    const { channelId } = req.params;
    const { guildId } = req.body;

    const serviceResponse = await Services.Channels.Handler.add(
      guildId as string,
      channelId as string
    );

    handleServiceResponse(serviceResponse, res);
  });

  /**
   * Disables auto-publishing in a specific channel
   * Removes the channel from the Redis cache and DB
   */
  router.delete('/', validateRequest(ChannelReqSchema), async (req: Request, res: Response) => {
    const { channelId } = req.params;

    const serviceResponse = await Services.Channels.Handler.remove(channelId as string);

    handleServiceResponse(serviceResponse, res);
  });

  /**
   * Update filter mode for channel
   */
  router.put(
    '/filter-mode',
    validateRequest(UpdateFilterModeReqSchema),
    async (req: Request, res: Response) => {
      const { channelId } = req.params;
      const { mode } = req.body;

      const serviceResponse = await Services.Channels.Handler.updateFilterMode(
        channelId as string,
        mode
      );

      handleServiceResponse(serviceResponse, res);
    }
  );

  /**
   * Flag channel as invalid
   */
  router.post('/flag', async (req: Request, res: Response) => {
    const { channelId } = req.params;

    const serviceResponse = await Services.Channels.Handler.flagChannel(channelId as string);

    handleServiceResponse(serviceResponse, res);
  });

  /**
   * Unflag channel (clear invalid status)
   */
  router.post('/unflag', async (req: Request, res: Response) => {
    const { channelId } = req.params;

    const serviceResponse = await Services.Channels.Handler.unflagChannel(channelId as string);

    handleServiceResponse(serviceResponse, res);
  });

  return router;
})();
