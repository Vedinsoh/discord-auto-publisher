import type { Edition } from '@ap/api-types';
import { botPresence, db, guild, subscription } from '@ap/database';
import { type APIResponse, StatusCodes, sendErrorResponse } from '@ap/express';
import { Keys } from '@ap/redis';
import { Data } from 'data/index.js';
import { and, inArray, isNull } from 'drizzle-orm';
import express, { type Request, type Response, type Router } from 'express';
import { Services } from 'services/index.js';
import { isEntitledStatus } from 'services/subscriptions.js';

const MANAGE_GUILD = BigInt(0x20);

type DiscordPartialGuild = {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
};

export const User: Router = (() => {
  const router = express.Router({ mergeParams: true });

  /**
   * GET /api/user/guilds
   * Returns guilds where user has MANAGE_GUILD, with per-edition bot presence,
   * subscription status, and pending-handover state (one Discord fetch total)
   */
  router.get('/guilds', async (req: Request, res: Response) => {
    const token = req.discordAccessToken;

    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        status: StatusCodes.UNAUTHORIZED,
        message: 'Authentication required',
      } as APIResponse);
      return;
    }

    try {
      // Fetch user's guilds from Discord
      const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        res.status(StatusCodes.BAD_GATEWAY).json({
          status: StatusCodes.BAD_GATEWAY,
          message: 'Failed to fetch guilds from Discord',
        } as APIResponse);
        return;
      }

      const allGuilds: DiscordPartialGuild[] = await response.json();

      // Filter to guilds with MANAGE_GUILD permission
      const managedGuilds = allGuilds.filter(
        g => (BigInt(g.permissions) & MANAGE_GUILD) !== BigInt(0)
      );

      if (managedGuilds.length === 0) {
        res.status(StatusCodes.OK).json({
          status: StatusCodes.OK,
          data: [],
          message: 'Guilds retrieved successfully',
        } as APIResponse);
        return;
      }

      const guildIds = managedGuilds.map(g => g.id);

      // Batch query: active bot presences per edition
      const presences = await db
        .select({ guildId: botPresence.guildId, edition: botPresence.edition })
        .from(botPresence)
        .where(and(inArray(botPresence.guildId, guildIds), isNull(botPresence.leftAt)));
      const freeGuildIds = new Set(presences.filter(p => p.edition === 'free').map(p => p.guildId));
      const premiumGuildIds = new Set(
        presences.filter(p => p.edition === 'premium').map(p => p.guildId)
      );

      // Self-heal presences the event path cannot repair (re-auth of an
      // already-present bot fires no gateway event; rows lost to DB resets) —
      // the invite-return refresh must show the bot immediately, not after the
      // nightly reconcile
      await Promise.all(
        managedGuilds.map(async g => {
          const absentEditions: Edition[] = [];
          if (!freeGuildIds.has(g.id)) absentEditions.push('free');
          if (!premiumGuildIds.has(g.id)) absentEditions.push('premium');
          if (absentEditions.length === 0) return;

          const healed = await Services.PresenceHeal.healAbsentEditions(g.id, absentEditions);
          if (healed.has('free')) freeGuildIds.add(g.id);
          if (healed.has('premium')) premiumGuildIds.add(g.id);
        })
      );

      // MIGRATION: Remove after migration period (6 months)
      const guildRows = await db
        .select({ guildId: guild.guildId, migratedAt: guild.migratedAt })
        .from(guild)
        .where(inArray(guild.guildId, guildIds));
      const migratedGuildIds = new Set(
        guildRows.filter(g => g.migratedAt !== null).map(g => g.guildId)
      );

      // Batch query: which guilds have active subscriptions
      const subscriptions = await db
        .select({ guildId: subscription.guildId, status: subscription.status })
        .from(subscription)
        .where(inArray(subscription.guildId, guildIds));
      const subscribedGuildIds = new Set(
        subscriptions.filter(s => isEntitledStatus(s.status)).map(s => s.guildId)
      );

      // Pending handover markers — only possible where both bots are present
      const bothPresentIds = guildIds.filter(id => freeGuildIds.has(id) && premiumGuildIds.has(id));
      const pendingGuildIds = new Set<string>();
      if (bothPresentIds.length > 0) {
        const markers = await Data.Drivers.Redis.PremiumPending.mget(
          bothPresentIds.map(id => `${Keys.PremiumPending}:${id}`)
        );
        bothPresentIds.forEach((id, index) => {
          if (markers[index] !== null) pendingGuildIds.add(id);
        });
      }

      const result = managedGuilds.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        permissions: g.permissions,
        freeBotPresent: freeGuildIds.has(g.id),
        premiumBotPresent: premiumGuildIds.has(g.id),
        premiumPending: pendingGuildIds.has(g.id),
        migrated: migratedGuildIds.has(g.id),
        hasSubscription: subscribedGuildIds.has(g.id),
      }));

      res.status(StatusCodes.OK).json({
        status: StatusCodes.OK,
        data: result,
        message: 'Guilds retrieved successfully',
      } as APIResponse);
    } catch (error) {
      sendErrorResponse(res, error, 'Failed to retrieve guilds');
    }
  });

  return router;
})();
