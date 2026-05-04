import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DiscordAPIError, HTTPError, RateLimitError, type REST, type RequestMethod, type RouteLike } from '@discordjs/rest';
import { logger } from '../logger.js';
import { InvalidRequestsCounter } from '../redis/index.js';

const INVALID_REQUEST_STATUSES = new Set([401, 403, 429]);
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

const buildHeaders = (req: IncomingMessage): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'] as string;
  if (req.headers['x-audit-log-reason']) headers['x-audit-log-reason'] = req.headers['x-audit-log-reason'] as string;
  return headers;
};

const hasBody = (req: IncomingMessage): boolean => {
  if (!METHODS_WITH_BODY.has(req.method ?? '')) return false;
  const lengthHeader = req.headers['content-length'];
  if (lengthHeader && Number(lengthHeader) > 0) return true;
  const transferEncoding = req.headers['transfer-encoding'];
  return Boolean(transferEncoding);
};

export const handlePassthrough = async (
  api: REST,
  req: IncomingMessage,
  res: ServerResponse,
  fullRoute: RouteLike,
  method: RequestMethod,
  query: URLSearchParams,
) => {
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

    const discordResponse = await api.queueRequest(requestOptions);

    res.statusCode = discordResponse.status;
    for (const [header, value] of discordResponse.headers) res.setHeader(header, value);

    if (discordResponse.body) {
      const stream =
        discordResponse.body instanceof Readable
          ? discordResponse.body
          : Readable.fromWeb(discordResponse.body);
      await pipeline(stream, res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      if (error.scope !== 'shared') void InvalidRequestsCounter.increment(429);
      res.statusCode = 429;
      res.setHeader('Retry-After', String(error.retryAfter / 1_000));
      res.setHeader('X-RateLimit-Reset-After', String(error.retryAfter / 1_000));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Limit', String(error.limit));
      res.setHeader('X-RateLimit-Bucket', error.hash);
      res.setHeader('X-RateLimit-Scope', error.scope);
      if (error.global) res.setHeader('X-RateLimit-Global', 'true');
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          message: 'You are being rate limited.',
          retry_after: error.retryAfter / 1_000,
          global: error.global,
        }),
      );
      return;
    }

    if (error instanceof DiscordAPIError) {
      if (INVALID_REQUEST_STATUSES.has(error.status)) void InvalidRequestsCounter.increment(error.status);
      res.statusCode = error.status;
      if (error.rawError) {
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(error.rawError));
      }
      res.end();
      return;
    }

    if (error instanceof HTTPError) {
      if (INVALID_REQUEST_STATUSES.has(error.status)) void InvalidRequestsCounter.increment(error.status);
      res.statusCode = error.status;
      res.end();
      return;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      res.statusCode = 504;
      res.end();
      return;
    }

    logger.error({ event: 'passthrough.unhandled_error', err: error, fullRoute, method });
    res.statusCode = 500;
    res.end();
  }
};
