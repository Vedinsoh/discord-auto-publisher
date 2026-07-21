import { botPresence, db, guild, subscription } from '@ap/database';
import {
  type APIResponse,
  discordGuildsCacheKey,
  GUILDS_CACHE_TTL_SECONDS,
  StatusCodes,
  sendErrorResponse,
} from '@ap/express';
import { Keys } from '@ap/redis';
import { Data } from 'data/index.js';
import { and, inArray, isNull } from 'drizzle-orm';
import express, { type Request, type Response, type Router } from 'express';
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
      const cacheKey = discordGuildsCacheKey(token);

      // Read through the shared per-token guild-list cache (the same key
      // requireGuildPermission reads). A hit skips the user-token
      // /users/@me/guilds call entirely; a miss fetches and warms it. The
      // membership check in the middleware needs guilds the user does NOT
      // manage too, so the raw full list is cached. Presence/subscription
      // below are still composed live from Postgres, so only the raw Discord
      // list is cached — the derived flags never go stale.
      let allGuilds: DiscordPartialGuild[] | null = null;
      const cached = await Data.Drivers.Redis.DiscordAuth.get(cacheKey).catch(() => null);
      if (cached) {
        try {
          allGuilds = JSON.parse(cached) as DiscordPartialGuild[];
        } catch {
          allGuilds = null;
        }
      }

      if (!allGuilds) {
        const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          // A dead user token surfaces HERE, not in createDiscordAuth, when the
          // 5 min auth cache is still warm but this 60s guild-list cache has
          // expired. Map Discord's 401 to a 401 so the web's reactive re-login
          // fires (ADR 0010) — a flattened 502 would be swallowed as a generic
          // error and eject the user to the server list. Any other upstream
          // failure (429/5xx) stays a transient 502 the web retries in place.
          const status =
            response.status === StatusCodes.UNAUTHORIZED
              ? StatusCodes.UNAUTHORIZED
              : StatusCodes.BAD_GATEWAY;
          res.status(status).json({
            status,
            message:
              status === StatusCodes.UNAUTHORIZED
                ? 'Invalid or expired Discord token'
                : 'Failed to fetch guilds from Discord',
          } as APIResponse);
          return;
        }

        allGuilds = (await response.json()) as DiscordPartialGuild[];

        // Fire-and-forget warm: a cache-write failure must not fail the request.
        Data.Drivers.Redis.DiscordAuth.set(
          cacheKey,
          JSON.stringify(allGuilds),
          'EX',
          GUILDS_CACHE_TTL_SECONDS
        ).catch(() => {});
      }

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

      // Independent per-guild batches — all keyed only on guildIds, so fetch
      // them concurrently rather than in a waterfall.
      // MIGRATION: the guild-migration query is removed after migration period.
      const [presences, guildRows, subscriptions] = await Promise.all([
        db
          .select({ guildId: botPresence.guildId, edition: botPresence.edition })
          .from(botPresence)
          .where(and(inArray(botPresence.guildId, guildIds), isNull(botPresence.leftAt))),
        db
          .select({ guildId: guild.guildId, migratedAt: guild.migratedAt })
          .from(guild)
          .where(inArray(guild.guildId, guildIds)),
        db
          .select({ guildId: subscription.guildId, status: subscription.status })
          .from(subscription)
          .where(inArray(subscription.guildId, guildIds)),
      ]);

      const freeGuildIds = new Set(presences.filter(p => p.edition === 'free').map(p => p.guildId));
      const premiumGuildIds = new Set(
        presences.filter(p => p.edition === 'premium').map(p => p.guildId)
      );
      const migratedGuildIds = new Set(
        guildRows.filter(g => g.migratedAt !== null).map(g => g.guildId)
      );
      const subscribedGuildIds = new Set(
        subscriptions.filter(s => isEntitledStatus(s.status)).map(s => s.guildId)
      );

      // Presence is read live from Postgres here; the event path
      // (guildCreate/guildDelete + nightly reconcile) keeps it honest. The
      // one gap the event path cannot repair — re-authorizing a bot already a
      // member fires no gateway event — is healed on the guild-detail read
      // (GET /api/guild/:guildId), scoped to the one guild being opened rather
      // than a fan-out over every managed guild here (ADR 0007, 2026-07-15).

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
