import { type APIResponse, StatusCodes, sendErrorResponse, validateRequest } from '@ap/express';
import express, { type Router } from 'express';
import { Services } from 'services/index.js';
import { GuildDeleteReqSchema, GuildRegisterReqSchema, GuildReqSchema } from 'utils/validations.js';

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
   * Bot kicked/left the guild (guildDelete): soft-deletes the edition's
   * presence — config and cache are preserved so a re-invite restores
   * everything. Hard delete happens via the reconciliation purge 30 days
   * after the last bot left.
   */
  router.delete('/', validateRequest(GuildDeleteReqSchema), async (req, res) => {
    const { guildId } = req.params;
    const { edition } = req.body;

    try {
      await Services.Guilds.softDelete(guildId, edition);
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
   * Bot joined or was re-invited to the guild (guildCreate): upsert the guild
   * row, activate the edition's presence, prune channel config for channels
   * deleted while no bot was watching (missed channelDelete events), rebuild
   * the derived cache, and run the join orchestration (entitlement gate /
   * premium handover / free leave while premium manages).
   */
  router.post('/new', validateRequest(GuildRegisterReqSchema), async (req, res) => {
    const { guildId } = req.params;
    const { edition, announcementChannelIds } = req.body;

    try {
      await Services.Guilds.registerNewGuild(guildId, edition, announcementChannelIds);
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
