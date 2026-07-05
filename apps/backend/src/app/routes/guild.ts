import { type APIResponse, StatusCodes, sendErrorResponse, validateRequest } from '@ap/express';
import express, { type Router } from 'express';
import { Services } from 'services/index.js';
import { GuildReqSchema } from 'utils/validations.js';

export const Guild: Router = (() => {
  const router = express.Router({ mergeParams: true });

  /**
   * Get all channels enabled for auto-publishing in a guild
   * Returns array of channel IDs
   */
  router.get('/channels', validateRequest(GuildReqSchema), async (req, res) => {
    const { guildId } = req.params;

    try {
      const channelIds = await Services.Guilds.getChannels(guildId);
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
   * Bot kicked/left the guild (guildDelete): soft delete — config and cache
   * are preserved so a re-invite restores everything. Hard delete happens via
   * the reconciliation purge after 30 days.
   */
  router.delete('/', validateRequest(GuildReqSchema), async (req, res) => {
    const { guildId } = req.params;

    try {
      await Services.Guilds.softDelete(guildId);
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
  router.post('/new', validateRequest(GuildReqSchema), async (req, res) => {
    const { guildId } = req.params;

    try {
      await Services.Guilds.registerNewGuild(guildId);
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
