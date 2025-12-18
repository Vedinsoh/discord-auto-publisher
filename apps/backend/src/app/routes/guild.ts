import { type APIResponse, StatusCodes, sendErrorResponse, validateRequest } from '@ap/express';
import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import { GuildReqSchema } from 'utils/validations.js';

export const Guild: Router = (() => {
  const router = express.Router({ mergeParams: true });

  /**
   * Get all channels enabled for auto-publishing in a guild
   * Returns array of channel IDs
   */
  router.get('/channels', validateRequest(GuildReqSchema), async (req: Request, res: Response) => {
    const { guildId } = req.params;

    try {
      const channelIds = await Services.Guilds.getChannels(guildId as string);
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: { channelIds },
        message: 'Channels retrieved successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to retrieve channels');
    }
  });

  /**
   * Deletes a guild and all its associated channels
   * Removes the guild and channels from both the DB and Redis cache
   */
  router.delete('/', validateRequest(GuildReqSchema), async (req: Request, res: Response) => {
    const { guildId } = req.params;

    try {
      await Services.Guilds.remove(guildId as string);
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: { success: true },
        message: 'Guild removed successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to remove guild');
    }
  });

  /**
   * Register new guild in cache (marks as using new system)
   * MIGRATION: After transition (6 months), remove this endpoint entirely
   */
  router.post('/new', validateRequest(GuildReqSchema), async (req: Request, res: Response) => {
    const { guildId } = req.params;

    try {
      await Services.Guilds.registerNewGuild(guildId as string);
      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: { success: true },
        message: 'Guild registered successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to register new guild');
    }
  });

  return router;
})();
