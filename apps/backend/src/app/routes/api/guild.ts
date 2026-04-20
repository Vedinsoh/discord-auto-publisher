import { config, env } from '@ap/config';
import { type APIResponse, StatusCodes, sendErrorResponse } from '@ap/express';
import { type APIChannel, ChannelType, Routes } from 'discord-api-types/v10';
import express, { type Request, type Response, type Router } from 'express';
import { Discord } from 'services/discord.js';
import { Services } from 'services/index.js';

export const GuildApi: Router = (() => {
  const router = express.Router({ mergeParams: true });

  /**
   * GET /api/guild/:guildId
   * Returns guild channels (enriched with Discord names) + subscription summary
   */
  router.get('/', async (req: Request, res: Response) => {
    const { guildId } = req.params;

    try {
      const [channelRecords, discordChannels, sub] = await Promise.all([
        Services.Guilds.getChannelRecords(guildId as string),
        Discord.rest.get(Routes.guildChannels(guildId as string)) as Promise<APIChannel[]>,
        config.isPremiumInstance
          ? Services.Subscriptions.getByGuildId(guildId as string)
          : Promise.resolve(null),
      ]);

      const enabledMap = new Map(channelRecords.map(ch => [ch.channelId, ch]));

      const channels = discordChannels
        .filter(c => c.type === ChannelType.GuildAnnouncement)
        .map(c => {
          const record = enabledMap.get(c.id);
          return {
            channelId: c.id,
            name: c.name ?? 'Unknown Channel',
            type: c.type,
            enabled: !!record,
            filters: record?.filters ?? [],
            filterMode: record?.filterMode ?? 'any',
          };
        });

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: {
          guildId,
          channels,
          subscription: sub
            ? {
                status: sub.status,
                currentPeriodEndsAt: sub.currentPeriodEndsAt,
                cancelledAt: sub.cancelledAt,
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
  router.get('/channels', async (req: Request, res: Response) => {
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
   * PUT /api/guild/:guildId/channel/:channelId
   * Enable channel for auto-publishing
   */
  router.put('/channel/:channelId', async (req: Request, res: Response) => {
    const { guildId, channelId } = req.params;

    try {
      await Services.Channels.add(guildId as string, channelId as string);

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
  router.delete('/channel/:channelId', async (req: Request, res: Response) => {
    const { channelId } = req.params;

    try {
      await Services.Channels.remove(channelId as string);

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
   * GET /api/guild/:guildId/subscription
   * Returns subscription details + portal URL if subscriber matches current user
   */
  router.get('/subscription', async (req: Request, res: Response) => {
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
      const sub = await Services.Subscriptions.getByGuildId(guildId as string);

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
      if (userId === sub.subscriberDiscordUserId && sub.stripeCustomerId) {
        try {
          const returnUrl = `${env.WEB_APP_ORIGIN}/dashboard/${guildId}/subscription`;
          portalUrl = await Services.Stripe.createPortalSession(sub.stripeCustomerId, returnUrl);
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
          cancelledAt: sub.cancelledAt,
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
   * Create a Stripe Checkout Session
   */
  router.post('/subscription/checkout', async (req: Request, res: Response) => {
    if (!config.isPremiumInstance) {
      res.status(StatusCodes.NOT_FOUND).json({
        status: StatusCodes.NOT_FOUND,
        message: 'Subscriptions are not available',
      } as APIResponse);
      return;
    }

    const { guildId } = req.params;
    const userId = req.discordUser?.id;
    const email = req.discordUser?.email;
    const { priceId } = req.body;

    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        status: StatusCodes.UNAUTHORIZED,
        message: 'Authentication required',
      } as APIResponse);
      return;
    }

    if (!priceId || typeof priceId !== 'string') {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        message: 'Missing priceId in request body',
      } as APIResponse);
      return;
    }

    try {
      // Check for existing active subscription
      const existing = await Services.Subscriptions.getByGuildId(guildId as string);
      if (existing && (existing.status === 'active' || existing.status === 'trialing')) {
        res.status(StatusCodes.CONFLICT).json({
          status: StatusCodes.CONFLICT,
          message: 'Guild already has an active subscription',
        } as APIResponse);
        return;
      }

      // Look up or create Stripe Customer
      let stripeCustomerId: string | undefined;
      const existingCustomer = await Services.StripeCustomers.getByDiscordUserId(userId);

      if (existingCustomer) {
        stripeCustomerId = existingCustomer.stripeCustomerId;
      } else {
        const newCustomer = await Services.Stripe.createCustomer({
          email,
          discordUserId: userId,
        });
        await Services.StripeCustomers.upsert(userId, newCustomer.id, email);
        stripeCustomerId = newCustomer.id;
      }

      const successUrl = `${env.WEB_APP_ORIGIN}/dashboard/${guildId}/subscription?success=true`;
      const cancelUrl = `${env.WEB_APP_ORIGIN}/dashboard/${guildId}/subscription`;

      const result = await Services.Stripe.createCheckoutSession({
        guildId: guildId as string,
        discordUserId: userId,
        email,
        priceId,
        stripeCustomerId,
        successUrl,
        cancelUrl,
      });

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: result,
        message: 'Checkout session created',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to create checkout');
    }
  });

  return router;
})();
