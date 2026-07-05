import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  DiscordAPIError,
  HTTPError,
  RateLimitError,
  type REST,
  type RequestMethod,
  type RouteLike,
} from '@discordjs/rest';
import type { Request, RequestHandler, Response } from 'express';
import { logger } from '../logger.js';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);
const SLOW_REQUEST_MS = 5_000;
const STRIPPED_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
]);

const buildHeaders = (req: Request): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'] as string;
  }
  if (req.headers['x-audit-log-reason']) {
    headers['x-audit-log-reason'] = req.headers['x-audit-log-reason'] as string;
  }
  return headers;
};

const hasBody = (req: Request): boolean => {
  if (!METHODS_WITH_BODY.has(req.method)) return false;
  const lengthHeader = req.headers['content-length'];
  if (lengthHeader && Number(lengthHeader) > 0) return true;
  return Boolean(req.headers['transfer-encoding']);
};

const stripVersionPrefix = (path: string): RouteLike =>
  path.replace(/^\/api(\/v\d+)?/, '') as RouteLike;

const writeRateLimitResponse = (res: Response, error: RateLimitError) => {
  res.status(429);
  res.setHeader('Retry-After', String(error.retryAfter / 1_000));
  res.setHeader('X-RateLimit-Reset-After', String(error.retryAfter / 1_000));
  res.setHeader('X-RateLimit-Remaining', '0');
  res.setHeader('X-RateLimit-Limit', String(error.limit));
  res.setHeader('X-RateLimit-Bucket', error.hash);
  res.setHeader('X-RateLimit-Scope', error.scope);
  if (error.global) res.setHeader('X-RateLimit-Global', 'true');
  res.setHeader('Content-Type', 'application/json');
  res.json({
    message: 'You are being rate limited.',
    retry_after: error.retryAfter / 1_000,
    global: error.global,
  });
};

export const createPassthroughHandler =
  (rest: REST): RequestHandler =>
  async (req, res) => {
    const parsedUrl = new URL(req.url, 'http://noop');
    const fullRoute = stripVersionPrefix(parsedUrl.pathname);
    const method = req.method as RequestMethod;
    const query = parsedUrl.searchParams;

    try {
      const requestOptions: Parameters<REST['queueRequest']>[0] = {
        fullRoute,
        method,
        auth: true,
        query,
        headers: buildHeaders(req),
      };
      if (hasBody(req)) {
        requestOptions.body = req;
        requestOptions.passThroughBody = true;
      }

      const startedAt = Date.now();
      const discordResponse = await rest.queueRequest(requestOptions);
      const durationMs = Date.now() - startedAt;
      if (durationMs > SLOW_REQUEST_MS) {
        logger.warn({
          event: 'passthrough.slow',
          method,
          fullRoute,
          durationMs,
          status: discordResponse.status,
        });
      }

      res.status(discordResponse.status);
      for (const [header, value] of discordResponse.headers) {
        if (STRIPPED_RESPONSE_HEADERS.has(header.toLowerCase())) continue;
        res.setHeader(header, value);
      }

      if (discordResponse.body) {
        const stream =
          discordResponse.body instanceof Readable
            ? discordResponse.body
            : Readable.fromWeb(discordResponse.body);
        await pipeline(stream, res);
        return;
      }
      res.end();
    } catch (error) {
      if (error instanceof RateLimitError) {
        writeRateLimitResponse(res, error);
        return;
      }
      if (error instanceof DiscordAPIError) {
        res.status(error.status);
        if (error.rawError) {
          res.setHeader('Content-Type', 'application/json');
          res.json(error.rawError);
          return;
        }
        res.end();
        return;
      }
      if (error instanceof HTTPError) {
        res.status(error.status).end();
        return;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        res.status(504).end();
        return;
      }
      logger.error({ event: 'passthrough.unhandled_error', err: error, fullRoute, method });
      res.status(500).end();
    }
  };
