import { config } from '@ap/config';
import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

/**
 * Middleware to require premium instance for specific routes
 * Returns 403 Forbidden if not premium
 */
export const requirePremium = (_req: Request, res: Response, next: NextFunction): void => {
  if (!config.isPremiumInstance) {
    res.status(StatusCodes.FORBIDDEN).json({
      status: StatusCodes.FORBIDDEN,
      message: 'This feature is only available in premium edition',
    });
    return;
  }
  next();
};
