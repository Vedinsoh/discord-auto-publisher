import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

const GUILDS_CACHE_TTL_SECONDS = 60;
const MANAGE_GUILD = BigInt(0x20);

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
};

type DiscordPartialGuild = {
  id: string;
  permissions: string;
};

export function createRequireGuildPermission(redisClient: RedisLike) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.discordUser;
    const token = req.discordAccessToken;

    if (!user || !token) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        status: StatusCodes.UNAUTHORIZED,
        message: 'Authentication required',
      });
      return;
    }

    const { guildId } = req.params;

    if (!guildId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        status: StatusCodes.BAD_REQUEST,
        message: 'Missing guildId parameter',
      });
      return;
    }

    try {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const cacheKey = `discord_guilds:${tokenHash}`;

      let guilds: DiscordPartialGuild[];

      // Check Redis cache
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        guilds = JSON.parse(cached);
      } else {
        // Fetch from Discord API
        const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          res.status(StatusCodes.UNAUTHORIZED).json({
            status: StatusCodes.UNAUTHORIZED,
            message: 'Failed to verify guild membership',
          });
          return;
        }

        guilds = await response.json();

        // Cache guilds list
        await redisClient.set(cacheKey, JSON.stringify(guilds), { EX: GUILDS_CACHE_TTL_SECONDS });
      }

      const matchingGuild = guilds.find(g => g.id === guildId);

      if (!matchingGuild) {
        res.status(StatusCodes.FORBIDDEN).json({
          status: StatusCodes.FORBIDDEN,
          message: 'You are not a member of this guild',
        });
        return;
      }

      const hasPermission = (BigInt(matchingGuild.permissions) & MANAGE_GUILD) !== BigInt(0);

      if (!hasPermission) {
        res.status(StatusCodes.FORBIDDEN).json({
          status: StatusCodes.FORBIDDEN,
          message: 'You do not have Manage Server permission in this guild',
        });
        return;
      }

      next();
    } catch {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify guild permissions',
      });
    }
  };
}
