import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import { handleServiceResponse } from 'utils/httpHandlers.js';

export const Guild: Router = (() => {
  const router = express.Router();

  /**
   * Deletes a guild and all its associated channels
   * Removes the guild and channels from both the DB and Redis cache
   */
  router.delete('/:guildId', async (req: Request, res: Response) => {
    const { guildId } = req.params;

    const serviceResponse = await Services.Guilds.Handler.remove(guildId as string);

    handleServiceResponse(serviceResponse, res);
  });

  return router;
})();
