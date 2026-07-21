import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export const GUILDS_CACHE_TTL_SECONDS = 60;
const MANAGE_GUILD = BigInt(0x20);

/**
 * Redis key for a requester's cached `/users/@me/guilds` response, namespaced by
 * a hash of their OAuth token. Exported so `GET /api/user/guilds` can warm the
 * same entry it fetches — the two used to fetch Discord independently, and the
 * redundant second call (this middleware's) intermittently 429'd, surfacing as a
 * spurious "Failed to verify guild membership" 401.
 */
export function discordGuildsCacheKey(token: string): string {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return `discord_guilds:${tokenHash}`;
}

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ex: 'EX', seconds: number): Promise<unknown>;
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
      const cacheKey = discordGuildsCacheKey(token);

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
          // Only a genuine Discord 401 means a dead token (→ reactive re-login,
          // ADR 0010). A transient 429/5xx must NOT masquerade as auth-expiry,
          // or a blip forces a needless full OAuth round-trip; surface those as
          // a 502 the web retries in place.
          const status =
            response.status === StatusCodes.UNAUTHORIZED
              ? StatusCodes.UNAUTHORIZED
              : StatusCodes.BAD_GATEWAY;
          res.status(status).json({
            status,
            message:
              status === StatusCodes.UNAUTHORIZED
                ? 'Invalid or expired Discord token'
                : 'Failed to verify guild membership',
          });
          return;
        }

        guilds = await response.json();

        // Cache guilds list
        await redisClient.set(cacheKey, JSON.stringify(guilds), 'EX', GUILDS_CACHE_TTL_SECONDS);
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
