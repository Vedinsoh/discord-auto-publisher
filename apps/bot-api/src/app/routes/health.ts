import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

/**
 * Health check endpoint for Docker health checks
 */
export function Health(_req: Request, res: Response) {
  res.status(StatusCodes.OK).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
  });
}
