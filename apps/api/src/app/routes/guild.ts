import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import { handleServiceResponse, validateRequest } from 'utils/httpHandlers.js';
import { GuildReqSchema } from 'utils/validations.js';

export const Guild: Router = (() => {
  const router = express.Router();

  /**
   * Get all channels enabled for auto-publishing in a guild
   * Returns array of channel IDs
   */
  router.get(
    '/:guildId/channels',
    validateRequest(GuildReqSchema),
    async (req: Request, res: Response) => {
      const { guildId } = req.params;

      const serviceResponse = await Services.Guilds.Handler.getChannels(guildId as string);

      handleServiceResponse(serviceResponse, res);
    }
  );

  /**
   * Deletes a guild and all its associated channels
   * Removes the guild and channels from both the DB and Redis cache
   */
  router.delete(
    '/:guildId',
    validateRequest(GuildReqSchema),
    async (req: Request, res: Response) => {
      const { guildId } = req.params;

      const serviceResponse = await Services.Guilds.Handler.remove(guildId as string);

      handleServiceResponse(serviceResponse, res);
    }
  );

  return router;
})();
