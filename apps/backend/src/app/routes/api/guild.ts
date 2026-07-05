import { config, env } from '@ap/config';
import { type APIResponse, StatusCodes, sendErrorResponse, validateRequest } from '@ap/express';
import { type APIChannel, ChannelType, Routes } from 'discord-api-types/v10';
import express, { type Router } from 'express';
import { Discord } from 'services/discord.js';
import { Services } from 'services/index.js';
import { isEntitledStatus } from 'services/subscriptions.js';
import {
  GuildChannelReqSchema,
  GuildMigrateReqSchema,
  GuildReqSchema,
  SubscriptionCheckoutReqSchema,
} from 'utils/validations.js';

/** Announcement channels of a guild, fetched through the proxy */
const fetchAnnouncementChannels = async (guildId: string): Promise<APIChannel[]> => {
  const channels = (await Discord.rest.get(Routes.guildChannels(guildId))) as APIChannel[];
  return channels.filter(c => c.type === ChannelType.GuildAnnouncement);
};

export const GuildApi: Router = (() => {
  const router = express.Router({ mergeParams: true });

  /**
   * GET /api/guild/:guildId
   * Returns guild channels (enriched with Discord names) + subscription summary
   */
  router.get('/', validateRequest(GuildReqSchema), async (req, res) => {
    const { guildId } = req.params;

    try {
      const [channelRecords, announcementChannels, guildRow, sub] = await Promise.all([
        Services.Guilds.getChannelRecords(guildId),
        fetchAnnouncementChannels(guildId),
        Services.Guilds.find(guildId),
        config.isPremiumInstance
          ? Services.Subscriptions.getByGuildId(guildId)
          : Promise.resolve(null),
      ]);

      // MIGRATION: legacy guild = no row yet (pre-reconcile) or migratedAt NULL
      const migrated = !!guildRow?.migratedAt;

      // canPublish drives migrate-modal preselection — computed (and cached)
      // for legacy guilds only, to keep the extra REST calls off the hot path
      const canPublishMap = migrated
        ? null
        : await Services.LegacyPerms.getCanPublishMap(guildId, announcementChannels);

      const enabledMap = new Map(channelRecords.map(ch => [ch.channelId, ch]));

      const channels = announcementChannels.map(c => {
        const record = enabledMap.get(c.id);
        return {
          channelId: c.id,
          name: c.name ?? 'Unknown Channel',
          type: c.type,
          enabled: !!record,
          filters: record?.filters ?? [],
          filterMode: record?.filterMode ?? 'any',
          ...(canPublishMap ? { canPublish: canPublishMap[c.id] ?? false } : {}),
        };
      });

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: {
          guildId,
          migrated,
          channelLimit: config.limits.channelsPerGuild,
          channels,
          subscription: sub
            ? {
                status: sub.status,
                billingInterval: sub.billingInterval,
                currentPeriodEndsAt: sub.currentPeriodEndsAt,
                scheduledChange:
                  sub.scheduledChangeAction && sub.scheduledChangeAt
                    ? { action: sub.scheduledChangeAction, effectiveAt: sub.scheduledChangeAt }
                    : null,
                canceledAt: sub.canceledAt,
              }
            : null,
        },
        message: 'Guild data retrieved successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to retrieve guild data');
    }
  });

  /**
   * GET /api/guild/:guildId/channels
   * Returns channel list with filters from DB
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
   * PUT /api/guild/:guildId/channel/:channelId
   * Enable channel for auto-publishing. Validates the channel is an
   * announcement channel of THIS guild — the bot hot path trusts the
   * channel-level cache, so a cross-guild channelId would force-publish
   * someone else's channel.
   */
  router.put('/channel/:channelId', validateRequest(GuildChannelReqSchema), async (req, res) => {
    const { guildId, channelId } = req.params;

    try {
      const announcementChannels = await fetchAnnouncementChannels(guildId);

      if (!announcementChannels.some(c => c.id === channelId)) {
        res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: 'Channel is not an announcement channel of this guild',
        } as APIResponse);
        return;
      }

      await Services.Channels.add(guildId, channelId);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: { success: true },
        message: 'Channel enabled successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to enable channel');
    }
  });

  /**
   * DELETE /api/guild/:guildId/channel/:channelId
   * Disable channel for auto-publishing
   */
  router.delete('/channel/:channelId', validateRequest(GuildChannelReqSchema), async (req, res) => {
    const { channelId } = req.params;

    try {
      await Services.Channels.remove(channelId);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: { success: true },
        message: 'Channel disabled successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to disable channel');
    }
  });

  /**
   * POST /api/guild/:guildId/migrate
   * Migrate a legacy guild to the allowlist model with the given channels.
   * MIGRATION: Remove after migration period (6 months)
   */
  router.post('/migrate', validateRequest(GuildMigrateReqSchema), async (req, res) => {
    const { guildId } = req.params;
    const { channelIds } = req.body as { channelIds: string[] };

    try {
      const uniqueChannelIds = [...new Set(channelIds)];

      const announcementChannels = await fetchAnnouncementChannels(guildId);
      const announcementIds = new Set(announcementChannels.map(c => c.id));
      const invalid = uniqueChannelIds.filter(id => !announcementIds.has(id));

      if (invalid.length > 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: 'All channels must be announcement channels of this guild',
        } as APIResponse);
        return;
      }

      // Already-migrated and channel-limit rejections are enforced in the service
      await Services.Guilds.migrate(guildId, uniqueChannelIds);

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: { success: true },
        message: 'Guild migrated successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to migrate guild');
    }
  });

  /**
   * GET /api/guild/:guildId/subscription
   * Returns subscription details + portal URL if subscriber matches current user
   */
  router.get('/subscription', validateRequest(GuildReqSchema), async (req, res) => {
    if (!config.isPremiumInstance) {
      res.status(StatusCodes.NOT_FOUND).json({
        status: StatusCodes.NOT_FOUND,
        message: 'Subscriptions are not available',
      } as APIResponse);
      return;
    }

    const { guildId } = req.params;
    const userId = req.discordUser?.id;

    try {
      const sub = await Services.Subscriptions.getByGuildId(guildId);

      if (!sub) {
        res.status(StatusCodes.OK).json({
          status: StatusCodes.OK,
          data: undefined,
          message: 'No subscription found',
        } as APIResponse);
        return;
      }

      let portalUrl: string | undefined;

      // Only provide portal URL if the requester is the subscriber
      if (userId === sub.subscriberDiscordUserId) {
        try {
          portalUrl = await Services.Paddle.createPortalSession(
            sub.paddleCustomerId,
            sub.paddleSubscriptionId
          );
        } catch {
          // Non-fatal: portal URL is optional
        }
      }

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: {
          status: sub.status,
          billingInterval: sub.billingInterval,
          currentPeriodEndsAt: sub.currentPeriodEndsAt,
          scheduledChange:
            sub.scheduledChangeAction && sub.scheduledChangeAt
              ? { action: sub.scheduledChangeAction, effectiveAt: sub.scheduledChangeAt }
              : null,
          canceledAt: sub.canceledAt,
          portalUrl,
        },
        message: 'Subscription retrieved successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to retrieve subscription');
    }
  });

  /**
   * POST /api/guild/:guildId/subscription/checkout
   * Creates a Paddle transaction for the overlay checkout (price resolved server-side)
   */
  router.post(
    '/subscription/checkout',
    validateRequest(SubscriptionCheckoutReqSchema),
    async (req, res) => {
      if (!config.isPremiumInstance) {
        res.status(StatusCodes.NOT_FOUND).json({
          status: StatusCodes.NOT_FOUND,
          message: 'Subscriptions are not available',
        } as APIResponse);
        return;
      }

      const { guildId } = req.params;
      const { interval } = req.body;
      const userId = req.discordUser?.id;

      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: 'Authentication required',
        } as APIResponse);
        return;
      }

      const priceId = interval === 'year' ? env.PADDLE_PRICE_YEARLY : env.PADDLE_PRICE_MONTHLY;

      if (!priceId) {
        res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
          status: StatusCodes.SERVICE_UNAVAILABLE,
          message: 'Checkout is not configured',
        } as APIResponse);
        return;
      }

      try {
        // Guard: one subscription per guild
        const existing = await Services.Subscriptions.getByGuildId(guildId);
        if (existing && isEntitledStatus(existing.status)) {
          res.status(StatusCodes.CONFLICT).json({
            status: StatusCodes.CONFLICT,
            message: 'Guild already has an active subscription',
          } as APIResponse);
          return;
        }

        // Reuse the Paddle customer if this Discord user already has one;
        // otherwise the checkout collects email and creates the customer.
        const existingCustomer = await Services.PaddleCustomers.getByDiscordUserId(userId);

        const result = await Services.Paddle.createCheckoutTransaction({
          discordGuildId: guildId,
          discordUserId: userId,
          priceId,
          paddleCustomerId: existingCustomer?.paddleCustomerId,
        });

        res.status(StatusCodes.OK).json({
          status: StatusCodes.OK,
          data: result,
          message: 'Checkout transaction created',
        } as APIResponse);
      } catch (error) {
        sendErrorResponse(res, error, 'Failed to create checkout');
      }
    }
  );

  return router;
})();
