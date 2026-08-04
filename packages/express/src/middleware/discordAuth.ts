import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { fetchDiscordUser } from '../discordUserApi.js';

declare global {
  namespace Express {
    interface Request {
      discordUser?: {
        id: string;
        username: string;
        avatar: string | null;
      };
      discordAccessToken?: string;
    }
  }
}

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ex: 'EX', seconds: number): Promise<unknown>;
};

type Logger = { warn: (obj: unknown, msg?: string) => void };

export function createDiscordAuth(redisClient: RedisLike, logger: Logger) {
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

    // Shared resilient read (fresh cache → retry → last-known-good). Only a
    // genuine Discord 401 is auth-expiry (→ 401, reactive re-login); a transient
    // 429/5xx with no stale fallback is a 502 the web retries in place. This
    // middleware runs on EVERY /api/* request, so the old "any non-ok → 401"
    // mapping turned every blip into a needless full OAuth round-trip.
    const result = await fetchDiscordUser(redisClient, token, logger);

    if (!result.ok) {
      const status = result.kind === 'auth' ? StatusCodes.UNAUTHORIZED : StatusCodes.BAD_GATEWAY;
      res.status(status).json({
        status,
        message:
          result.kind === 'auth'
            ? 'Invalid or expired Discord token'
            : 'Failed to validate Discord token',
      });
      return;
    }

    req.discordUser = result.data;
    req.discordAccessToken = token;
    next();
  };
}
