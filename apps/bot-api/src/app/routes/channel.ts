import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import { handleServiceResponse, validateRequest } from 'utils/httpHandlers.js';
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

      // TODO
      // Check if updates channel is configured

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
   * Gets all channels enabled for auto-publishing in a guild
   * Returns a list of channel IDs
   */
  router.get('/:guildId/:channelId', async (req: Request, res: Response) => {
    const { guildId, channelId } = req.params;

    // TODO
    // const serviceResponse = await Services.Channel.Handler.getAll(guildId as string);

    // handleServiceResponse(serviceResponse, res);
  });

  return router;
})();
