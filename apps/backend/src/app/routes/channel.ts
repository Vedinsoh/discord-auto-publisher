import { handleServiceResponse, validateRequest } from '@ap/express';
import express, { type Request, type Response, type Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Services } from 'services/index.js';
import { ChannelReqSchema } from 'utils/validations.js';

export const Channel: Router = (() => {
  const router = express.Router();

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
   * Checks if a specific channel is enabled for auto-publishing
   * Returns channel status
   */
  router.get(
    '/:guildId/:channelId',
    validateRequest(ChannelReqSchema),
    async (req: Request, res: Response) => {
      const { channelId } = req.params;

      const channel = await Services.Channels.Handler.get(channelId as string);

      if (channel) {
        res.status(StatusCodes.OK).json({
          enabled: true,
          channelId: channel,
        });
      } else {
        res.status(StatusCodes.OK).json({
          enabled: false,
        });
      }
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
