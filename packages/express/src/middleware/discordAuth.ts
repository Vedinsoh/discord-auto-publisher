import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

declare global {
  namespace Express {
    interface Request {
      discordUser?: {
        id: string;
        username: string;
        avatar: string | null;
        email?: string;
      };
      discordAccessToken?: string;
    }
  }
}

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
};

const CACHE_TTL_SECONDS = 300;

export function createDiscordAuth(redisClient: RedisLike) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        status: StatusCodes.UNAUTHORIZED,
        message: 'Missing or invalid Authorization header',
      });
      return;
    }

    const token = authHeader.slice(7);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const cacheKey = `discord_auth:${tokenHash}`;

    try {
      // Check Redis cache
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        const user = JSON.parse(cached);
        req.discordUser = user;
        req.discordAccessToken = token;
        next();
        return;
      }

      // Cache miss: validate with Discord API
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          status: StatusCodes.UNAUTHORIZED,
          message: 'Invalid or expired Discord token',
        });
        return;
      }

      const data = await response.json();
      const user = {
        id: data.id,
        username: data.username,
        avatar: data.avatar ?? null,
        email: data.email,
      };

      // Cache the user data
      await redisClient.set(cacheKey, JSON.stringify(user), { EX: CACHE_TTL_SECONDS });

      req.discordUser = user;
      req.discordAccessToken = token;
      next();
    } catch {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to validate Discord token',
      });
    }
  };
}
