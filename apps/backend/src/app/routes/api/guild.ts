import type { Edition, WithdrawalState } from '@ap/api-types';
import { env } from '@ap/config';
import type { Subscription } from '@ap/database';
import {
  type APIResponse,
  createHttpError,
  HttpError,
  StatusCodes,
  sendErrorResponse,
  validateRequest,
} from '@ap/express';
import { sortBySidebarOrder } from '@ap/utils';
import type { SetChannelFilters } from '@ap/validations';
import { DiscordAPIError, HTTPError } from '@discordjs/rest';
import {
  type APIChannel,
  type APIGuild,
  type APIRole,
  ChannelType,
  Routes,
} from 'discord-api-types/v10';
import express, { type Router } from 'express';
import { Discord } from 'services/discord.js';
import { Services } from 'services/index.js';
import { isEntitledStatus } from 'services/subscriptions.js';
import { logger } from 'utils/logger.js';
import {
  GuildChannelReqSchema,
  GuildMigrateReqSchema,
  GuildReqSchema,
  GuildSetChannelFiltersReqSchema,
  SubscriptionCheckoutReqSchema,
  WithdrawalSubmitReqSchema,
} from 'utils/validations.js';

/**
 * Guard shared by every filter-write route. Filters are a Premium feature that
 * only takes effect while the Premium bot is actively managing the guild
 * (managing edition = premium ⇒ premium bot present AND handover complete), so
 * editing them otherwise is a no-op the dashboard already locks. Enforced here
 * too — the UI lock is not a real gate. The `PREMIUM_INACTIVE` code lets the
 * client distinguish this from a generic 403.
 */
const assertPremiumActive = async (guildId: string): Promise<void> => {
  const managingEdition = await Services.Editions.getManagingEdition(guildId);
  if (managingEdition !== 'premium') {
    throw createHttpError(
      'Premium bot is not active for this guild',
      StatusCodes.FORBIDDEN,
      'PREMIUM_INACTIVE'
    );
  }
};

/**
 * Resolve a serving channel that belongs to this guild, or throw. Filters live
 * on the channel row and are mutated by channelId (its PK), so without the
 * guild-ownership check a guild admin could edit filters on a channel
 * registered under a different guild. A paused row (ADR 0009) is a disabled
 * channel with retained config — not a valid filter-edit target.
 */
const requireOwnedServingChannel = async (guildId: string, channelId: string): Promise<void> => {
  const record = await Services.Channels.find(channelId);
  if (!record || record.guildId !== guildId) {
    throw createHttpError('Channel does not belong to this guild', StatusCodes.BAD_REQUEST);
  }
  if (record.pausedAt) {
    throw createHttpError('Channel is not enabled', StatusCodes.CONFLICT);
  }
};

/**
 * Announcement channels of a guild, in Discord sidebar order (shared
 * {@link sortBySidebarOrder}), fetched through an edition's proxy. Discord's
 * REST list is unordered. Category positions are read from the full list before
 * it is filtered down.
 */
const fetchAnnouncementChannels = async (
  edition: Edition,
  guildId: string
): Promise<APIChannel[]> => {
  const channels = await Discord.cachedGet<APIChannel[]>(edition, Routes.guildChannels(guildId));

  const categoryPositions = new Map<string, number>();
  for (const c of channels) {
    if (c.type === ChannelType.GuildCategory) categoryPositions.set(c.id, c.position ?? 0);
  }

  return sortBySidebarOrder(
    channels.filter(c => c.type === ChannelType.GuildAnnouncement),
    c => ({
      id: c.id,
      position: 'position' in c ? (c.position ?? 0) : 0,
      parentId: ('parent_id' in c ? c.parent_id : null) ?? null,
    }),
    categoryPositions
  );
};

/**
 * Guild display name for a withdrawal statement's contract reference. Best-effort:
 * never let a cosmetic lookup fail a statutory control — null falls back to the guild id.
 */
const fetchGuildName = async (guildId: string): Promise<string | null> => {
  try {
    const managingEdition = await Services.Editions.getManagingEdition(guildId);
    const guild = await Discord.cachedGet<APIGuild>(managingEdition, Routes.guild(guildId));
    return guild.name ?? null;
  } catch (error) {
    logger.debug(error, `Could not resolve guild name for ${guildId}`);
    return null;
  }
};

/**
 * Subscriber-only gate, re-applied server-side on every withdrawal route: the right
 * belongs to the consumer who concluded the contract, not to any Manage Server co-admin.
 */
const requireWithdrawableSubscription = async (
  guildId: string,
  userId: string | undefined
): Promise<Subscription> => {
  const sub = await Services.Subscriptions.getByGuildId(guildId);

  if (!sub) {
    throw createHttpError(
      'This server has no subscription to withdraw from',
      StatusCodes.NOT_FOUND,
      'NO_SUBSCRIPTION'
    );
  }

  if (!userId || userId !== sub.subscriberDiscordUserId) {
    throw createHttpError(
      'Only the subscriber can withdraw from this contract',
      StatusCodes.FORBIDDEN,
      'NOT_SUBSCRIBER'
    );
  }

  return sub;
};

/**
 * Withdrawal state for the subscription endpoint. `consumerName` and
 * `contractReference` are composed server-side so what is displayed is exactly what
 * gets stored (čl. 64 evidence) — never accept them from the client.
 */
const buildWithdrawalState = async (
  sub: Subscription,
  discordUser: { id: string; username: string } | undefined
): Promise<WithdrawalState> => {
  const [latest, guildName] = await Promise.all([
    Services.Withdrawals.findLatest(sub.paddleSubscriptionId),
    fetchGuildName(sub.guildId),
  ]);

  const statement = Services.Withdrawals.composeStatement(
    sub,
    discordUser?.username ?? sub.subscriberDiscordUserId ?? 'Unknown',
    guildName
  );

  return {
    eligible: Services.Withdrawals.isWithinWindow(sub),
    windowEndsAt: Services.Withdrawals.windowEndsAt(sub).toISOString(),
    ...statement,
    contractDisplay: Services.Withdrawals.composeContractDisplay(sub, guildName),
    confirmedAt: latest?.confirmedAt?.toISOString() ?? null,
  };
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
      // Self-heal before reading presence-derived state — the invite-return
      // lands here, and re-authorizing an already-present bot fires no gateway
      // event, so a missing row would otherwise stick until the nightly
      // reconcile. Premium is entitlement-gated: a non-entitled guild's only
      // "present" outcome is the revocation leave (owned by the nightly
      // reconcile), so skip the premium member-fetch there (ADR 0007). Fetch
      // the subscription up front so the gate can read entitlement.
      const [activeEditions, sub] = await Promise.all([
        Services.Editions.getActiveEditions(guildId),
        Services.Subscriptions.getByGuildId(guildId),
      ]);
      const entitled = !!sub && isEntitledStatus(sub.status);
      const absentEditions = (['free', 'premium'] as Edition[]).filter(
        e => !activeEditions.has(e) && (e !== 'premium' || entitled)
      );
      const { healed, inconclusive } =
        absentEditions.length > 0
          ? await Services.PresenceHeal.healAbsentEditions(guildId, absentEditions)
          : { healed: new Set<Edition>(), inconclusive: false };

      // Botless guild (no bot present, even after the self-heal). Fail with a
      // distinct 409 rather than the generic 500 a downstream Discord 404 would
      // produce, so the web can tell "permanent, redirect to the server list
      // (which owns the invite CTA)" from a transient 5xx it should retry in
      // place. Effective presence = pre-heal active editions plus any restored.
      if (activeEditions.size === 0 && healed.size === 0) {
        // ...but only when Discord actually SAID the bot is absent. An
        // unresolved check (outage, proxy failure) must not render as the
        // permanent "bot isn't in your server" redirect — 503 lands in the
        // web's transient bucket and retries in place (ADR 0010).
        if (inconclusive) {
          throw createHttpError(
            'Could not confirm bot presence',
            StatusCodes.SERVICE_UNAVAILABLE,
            'PRESENCE_UNKNOWN'
          );
        }
        throw createHttpError('Bot is not in this guild', StatusCodes.CONFLICT, 'BOT_NOT_PRESENT');
      }

      const managingEdition = await Services.Editions.getManagingEdition(guildId);

      const [channelRecords, announcementChannels, guildRow, premiumPending] = await Promise.all([
        Services.Guilds.getChannelRecords(guildId),
        fetchAnnouncementChannels(managingEdition, guildId),
        Services.Guilds.find(guildId),
        Services.Handover.isPending(guildId),
      ]);

      // MIGRATION: legacy guild = no row yet (pre-reconcile) or migratedAt NULL
      const migrated = !!guildRow?.migratedAt;

      // Two evaluations, run concurrently, both served from the bot-pushed
      // publish-state cache (ADR 0008) with a REST write-back fallback:
      // - managingMap: the managing bot's publish capability per channel (drives
      //   the "Publishing / Not publishing" indicator + migrate-modal preselection)
      // - premiumBlockedIds (pending handover only): channels the premium bot
      //   cannot publish in yet where the free bot can — the "Premium bot needs
      //   access" nudge. A handover eval failure (e.g. a dangling marker after
      //   the premium bot was kicked) only omits that badge — never breaks the
      //   whole dashboard.
      const [managingMap, premiumBlockedIds] = await Promise.all([
        Services.PublishState.getEditionMap(guildId, managingEdition, announcementChannels),
        (async (): Promise<Set<string> | null> => {
          if (!premiumPending) return null;
          try {
            return new Set(await Services.Handover.getBlockedChannelIds(guildId));
          } catch (error) {
            logger.warn(error, `Blocked-channel evaluation failed for guild ${guildId}`);
            return null;
          }
        })(),
      ]);

      const enabledMap = new Map(channelRecords.map(ch => [ch.channelId, ch]));

      const channels = announcementChannels.map(c => {
        const record = enabledMap.get(c.id);
        const publish = managingMap[c.id];
        // Serving = a row exists AND is not paused (ADR 0009). A paused row is a
        // disabled channel with retained config → surfaced via hasSavedSetup.
        const serving = !!record && !record.pausedAt;
        return {
          channelId: c.id,
          name: c.name ?? 'Unknown Channel',
          type: c.type,
          enabled: serving,
          filters: record?.filters ?? [],
          filterMode: record?.filterMode ?? 'all',
          canPublish: publish?.canPublish ?? false,
          ...(premiumBlockedIds ? { premiumBotHasPermissions: !premiumBlockedIds.has(c.id) } : {}),
          ...(record?.pausedAt ? { hasSavedSetup: true } : {}),
        };
      });

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: {
          guildId,
          migrated,
          premiumPending,
          channelLimit: Services.Editions.channelLimitFor(managingEdition),
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
                isSubscriber: req.discordUser?.id === sub.subscriberDiscordUserId,
              }
            : null,
        },
        message: 'Guild data retrieved successfully',
      } as APIResponse);
    } catch (error) {
      // Diagnostic (Phase 1, ADR 0010): the web maps any non-401/403/404/409
      // here to a transient retry card. Log the actual upstream trigger — proxy
      // 504 / Discord 5xx / connection blip — so we can confirm the real cause
      // before hardening this read path. Intentional control-flow throws (the
      // 409 BOT_NOT_PRESENT above) are HttpErrors and expected, so skip them.
      if (!(error instanceof HttpError)) {
        const discordStatus =
          error instanceof DiscordAPIError || error instanceof HTTPError ? error.status : undefined;
        logger.warn(
          { err: error, guildId, discordStatus },
          `Guild-detail read failed (surfaces as transient) for guild ${guildId}`
        );
      }
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
      const managingEdition = await Services.Editions.getManagingEdition(guildId);
      const announcementChannels = await fetchAnnouncementChannels(managingEdition, guildId);

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
   * Disable channel for auto-publishing. Scoped to THIS guild — the channel
   * row is deleted by channelId (its PK), so without a guild-ownership check a
   * guild admin could disable a channel registered under a different guild.
   */
  router.delete('/channel/:channelId', validateRequest(GuildChannelReqSchema), async (req, res) => {
    const { guildId, channelId } = req.params;

    try {
      const record = await Services.Channels.find(channelId);

      if (record && record.guildId !== guildId) {
        res.status(StatusCodes.BAD_REQUEST).json({
          status: StatusCodes.BAD_REQUEST,
          message: 'Channel does not belong to this guild',
        } as APIResponse);
        return;
      }

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
   * GET /api/guild/:guildId/roles
   * Guild roles for the mention-filter role picker (excludes @everyone), highest
   * first. Served from the shared route-keyed read cache (5-min TTL), which the
   * premium bot busts on role create/update/delete.
   */
  router.get('/roles', validateRequest(GuildReqSchema), async (req, res) => {
    const { guildId } = req.params;

    try {
      const managingEdition = await Services.Editions.getManagingEdition(guildId);
      const roles = await Discord.cachedGet<APIRole[]>(managingEdition, Routes.guildRoles(guildId));

      const data = roles
        .filter(role => role.id !== guildId)
        .sort((a, b) => b.position - a.position)
        .map(role => ({ id: role.id, name: role.name, color: role.color }));

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data,
        message: 'Roles retrieved successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to retrieve roles');
    }
  });

  /**
   * PUT /api/guild/:guildId/channel/:channelId/filters
   * Atomically replace a channel's whole rule (match mode + all conditions) from
   * the dashboard inline builder. Premium-active + guild-ownership gated. The
   * per-channel cap is enforced by the service, which returns a `FILTER_LIMIT`
   * code the dashboard maps to a toast.
   */
  router.put(
    '/channel/:channelId/filters',
    validateRequest(GuildSetChannelFiltersReqSchema),
    async (req, res) => {
      const { guildId, channelId } = req.params;
      const { matchMode, conditions } = req.body as SetChannelFilters;

      try {
        await assertPremiumActive(guildId);
        await requireOwnedServingChannel(guildId, channelId);

        await Services.Channels.setFilters(channelId, matchMode, conditions);

        res.status(StatusCodes.OK).json({
          status: StatusCodes.OK,
          data: { success: true },
          message: 'Filters updated successfully',
        } as APIResponse);
      } catch (error) {
        sendErrorResponse(res, error, 'Failed to update filters');
      }
    }
  );

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

      const managingEdition = await Services.Editions.getManagingEdition(guildId);
      const announcementChannels = await fetchAnnouncementChannels(managingEdition, guildId);
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

      const isSubscriber = userId === sub.subscriberDiscordUserId;
      let portalUrl: string | undefined;
      let cancelUrl: string | null = null;

      // Only provide portal URLs if the requester is the subscriber
      if (isSubscriber) {
        try {
          const portal = await Services.Paddle.createPortalSession(
            sub.paddleCustomerId,
            sub.paddleSubscriptionId
          );
          portalUrl = portal.manageUrl;
          cancelUrl = portal.cancelUrl;
        } catch {
          // Non-fatal: portal URLs are optional
        }
      }

      // Non-subscriber admins see "Billing is managed by @X" — the subscriber's
      // own view is just the button, so skip the lookup for them. A null id means
      // retention already erased it, so there is no one left to name.
      const subscriberUsername =
        isSubscriber || !sub.subscriberDiscordUserId
          ? null
          : await Discord.getUsername(sub.subscriberDiscordUserId);

      // Withdrawal state (ZZP čl. 81.a) rides this endpoint, not one of its own, so the
      // control paints with the other billing controls (CRD recital 37).
      const withdrawal = isSubscriber ? await buildWithdrawalState(sub, req.discordUser) : null;

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
          portalUrl: portalUrl ?? null,
          cancelUrl,
          isSubscriber,
          subscriber: {
            id: sub.subscriberDiscordUserId,
            username: subscriberUsername,
          },
          withdrawal,
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
      const { guildId } = req.params;
      const { interval, termsVersion } = req.body;
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
        // Gate: a guild must be migrated (allowlist model) before it can buy
        // Premium — Premium's value (per-channel filters/control) lives on
        // registered channel rows, which only exist post-migration. Enforced
        // here as well as in the UI: the UI alone is not a real gate.
        // MIGRATION: Remove this guard after migration period (6 months)
        const guildRecord = await Services.Guilds.find(guildId);
        if (!guildRecord?.migratedAt) {
          throw createHttpError(
            'Guild must be migrated before upgrading to Premium',
            StatusCodes.CONFLICT,
            'NOT_MIGRATED'
          );
        }

        // Guard: one subscription per guild
        const existing = await Services.Subscriptions.getByGuildId(guildId);
        if (existing && isEntitledStatus(existing.status)) {
          res.status(StatusCodes.CONFLICT).json({
            status: StatusCodes.CONFLICT,
            message: 'Guild already has an active subscription',
          } as APIResponse);
          return;
        }

        // No customer pre-bind: the checkout always runs its collection step so
        // customers can self-serve business/VAT details ("Add tax number").
        // Binding an existing customerId hands Paddle a complete address, which
        // skips collection entirely. Paddle re-links the customer by email, so
        // repeat buyers keep one customer as long as they reuse their email.
        const result = await Services.Paddle.createCheckoutTransaction({
          discordGuildId: guildId,
          discordUserId: userId,
          priceId,
          termsVersion,
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

  /**
   * POST /api/guild/:guildId/subscription/withdrawal — the whole statutory withdrawal
   * function (ZZP čl. 81.a / CRD Art 11a) in one call; the statute has one sending event,
   * so never split it into a draft step plus a confirm step. Window is re-checked here on
   * every call, and the row is written before any effect runs (`applyEffects` never throws).
   */
  router.post(
    '/subscription/withdrawal',
    validateRequest(WithdrawalSubmitReqSchema),
    async (req, res) => {
      const { guildId } = req.params;
      const { notificationAddress } = req.body;

      try {
        const sub = await requireWithdrawableSubscription(guildId, req.discordUser?.id);

        const existing = await Services.Withdrawals.findLatest(sub.paddleSubscriptionId);
        if (existing?.confirmedAt) {
          throw createHttpError(
            'This contract has already been withdrawn from',
            StatusCodes.CONFLICT,
            'ALREADY_WITHDRAWN'
          );
        }

        if (!Services.Withdrawals.isWithinWindow(sub)) {
          throw createHttpError(
            'The 14-day withdrawal period has ended',
            StatusCodes.CONFLICT,
            'WITHDRAWAL_WINDOW_CLOSED'
          );
        }

        const record = await Services.Withdrawals.record({
          sub,
          consumerName: req.discordUser?.username ?? sub.subscriberDiscordUserId ?? 'Unknown',
          guildName: await fetchGuildName(guildId),
          notificationAddress,
        });

        // Lost a race with a concurrent confirm; the winner owns the effects, so this
        // request must not raise a second refund.
        if (!record?.confirmedAt) {
          throw createHttpError(
            'This contract has already been withdrawn from',
            StatusCodes.CONFLICT,
            'ALREADY_WITHDRAWN'
          );
        }

        const { acknowledged, refundStatus } = await Services.Withdrawals.applyEffects(record, sub);

        res.status(StatusCodes.OK).json({
          status: StatusCodes.OK,
          data: {
            submittedAt: record.submittedAt.toISOString(),
            confirmedAt: record.confirmedAt.toISOString(),
            notificationAddress,
            acknowledged,
            refundStatus,
          },
          message: 'Withdrawal recorded',
        } as APIResponse);
      } catch (error) {
        sendErrorResponse(res, error, 'Failed to record withdrawal');
      }
    }
  );

  return router;
})();
