import { db, guild, subscription } from '@ap/database';
import { type APIResponse, StatusCodes, sendErrorResponse } from '@ap/express';
import { inArray } from 'drizzle-orm';
import express, { type Request, type Response, type Router } from 'express';

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
   * Returns guilds where user has MANAGE_GUILD, with bot presence and subscription status
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

      // Batch query: which guilds have the bot
      const botGuilds = await db
        .select({ guildId: guild.guildId })
        .from(guild)
        .where(inArray(guild.guildId, guildIds));
      const botGuildIds = new Set(botGuilds.map(g => g.guildId));

      // Batch query: which guilds have active subscriptions
      const subscriptions = await db
        .select({ guildId: subscription.guildId, status: subscription.status })
        .from(subscription)
        .where(inArray(subscription.guildId, guildIds));
      const subscribedGuildIds = new Set(
        subscriptions
          .filter(s => s.status === 'active' || s.status === 'trialing')
          .map(s => s.guildId)
      );

      const result = managedGuilds.map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        permissions: g.permissions,
        botPresent: botGuildIds.has(g.id),
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
