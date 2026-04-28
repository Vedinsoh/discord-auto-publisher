import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import process from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  DiscordAPIError,
  HTTPError,
  RateLimitError,
  REST,
  type RequestMethod,
  type RouteLike,
} from '@discordjs/rest';
import { env } from './config.js';
import { logger } from './logger.js';
import { CrosspostsCounter, RateLimitsCache } from './redis/index.js';

const CROSSPOST_ROUTE = /^\/channels\/(\d{17,19})\/messages\/(\d{17,19})\/crosspost$/;
const INVALID_REQUEST_STATUSES = new Set([401, 403, 429]);
const ALREADY_CROSSPOSTED_CODE = 40033;

const api = new REST({
  rejectOnRateLimit: ({ scope, sublimitTimeout, timeToReset, global }) => {
    if (global) return true;
    if (scope === 'shared' && sublimitTimeout > 0) return true;
    return timeToReset > 60_000;
  },
  retries: 0,
}).setToken(env.DISCORD_TOKEN);

const writeRateLimitHeaders = (res: ServerResponse, error: RateLimitError) => {
  res.setHeader('Retry-After', String(error.retryAfter / 1_000));
  res.setHeader('X-RateLimit-Reset-After', String(error.retryAfter / 1_000));
  res.setHeader('X-RateLimit-Remaining', '0');
  res.setHeader('X-RateLimit-Limit', String(error.limit));
  res.setHeader('X-RateLimit-Bucket', error.hash);
  res.setHeader('X-RateLimit-Scope', error.scope);
  if (error.global) res.setHeader('X-RateLimit-Global', 'true');
};

const handleHealth = (res: ServerResponse) => {
  res.statusCode = 200;
  res.end('OK');
};

const handleInfo = async (res: ServerResponse) => {
  try {
    const [channelsCount, rateLimitsSize] = await Promise.all([
      CrosspostsCounter.getSize(),
      RateLimitsCache.getSize(),
    ]);
    const body = {
      data: {
        rest: {
          globalRemaining: api.globalRemaining,
          handlers: api.handlers.size,
          activeHandlers: api.handlers.filter((h) => !h.inactive).size,
          hashes: api.hashes.size,
        },
        channelsCount,
        rateLimitsSize,
      },
    };
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  } catch (error) {
    logger.error({ event: 'info.failed', err: error });
    res.statusCode = 500;
    res.end();
  }
};

const handleCrosspostPreCheck = async (channelId: string): Promise<boolean> => {
  const blocked = await CrosspostsCounter.isOverLimit(channelId);
  if (blocked) {
    logger.debug({ event: 'crosspost.blocked.counter', channelId });
  }
  return blocked;
};

const onCrosspostSuccess = (channelId: string, messageId: string) => {
  void CrosspostsCounter.increment(channelId);
  logger.debug({ event: 'crosspost.success', channelId, messageId });
};

const onCrosspostSublimit = (channelId: string, retryAfterSec: number) => {
  void CrosspostsCounter.lockSublimit(channelId, retryAfterSec);
  logger.info({ event: 'crosspost.sublimit', channelId, retryAfterSec });
};

const onAlreadyCrossposted = (channelId: string) => {
  void CrosspostsCounter.increment(channelId);
  logger.debug({ event: 'crosspost.already', channelId, code: ALREADY_CROSSPOSTED_CODE });
};

const onInvalidRequest = (status: number) => {
  void RateLimitsCache.add(status);
  logger.info({ event: 'cloudflare.invalid', status });
};

const buildHeaders = (req: IncomingMessage): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
  if (req.headers['x-audit-log-reason']) headers['x-audit-log-reason'] = req.headers['x-audit-log-reason'] as string;
  return headers;
};

const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
  const { method, url } = req;
  if (!method || !url) {
    res.statusCode = 400;
    res.end();
    return;
  }

  const parsedUrl = new URL(url, 'http://noop');

  if (parsedUrl.pathname === '/health') {
    handleHealth(res);
    return;
  }
  if (parsedUrl.pathname === '/info') {
    await handleInfo(res);
    return;
  }

  const fullRoute = parsedUrl.pathname.replace(/^\/api(\/v\d+)?/, '') as RouteLike;
  const crosspostMatch = method === 'POST' ? CROSSPOST_ROUTE.exec(fullRoute) : null;
  const channelId = crosspostMatch?.[1];
  const messageId = crosspostMatch?.[2];

  if (channelId && messageId) {
    if (await handleCrosspostPreCheck(channelId)) {
      res.statusCode = 204;
      res.end();
      return;
    }
  }

  try {
    const discordResponse = await api.queueRequest({
      body: req,
      fullRoute,
      method: method as RequestMethod,
      auth: true,
      passThroughBody: true,
      query: parsedUrl.searchParams,
      headers: buildHeaders(req),
    });

    if (channelId && messageId && discordResponse.status >= 200 && discordResponse.status < 300) {
      onCrosspostSuccess(channelId, messageId);
    }

    res.statusCode = discordResponse.status;
    for (const [header, value] of discordResponse.headers) {
      res.setHeader(header, value);
    }

    if (discordResponse.body) {
      const stream = discordResponse.body instanceof Readable
        ? discordResponse.body
        : Readable.fromWeb(discordResponse.body);
      await pipeline(stream, res);
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      if (channelId && error.scope === 'shared' && !error.global) {
        onCrosspostSublimit(channelId, error.retryAfter / 1_000);
      }
      // Per Discord docs, 429s with X-RateLimit-Scope: shared do not count
      // toward the invalid-request limit
      if (error.scope !== 'shared') {
        onInvalidRequest(429);
      }
      res.statusCode = 429;
      writeRateLimitHeaders(res, error);
      res.setHeader('Content-Type', 'application/json');
      res.write(
        JSON.stringify({
          message: 'You are being rate limited.',
          retry_after: error.retryAfter / 1_000,
          global: error.global,
        }),
      );
    } else if (error instanceof DiscordAPIError) {
      if (channelId && error.code === ALREADY_CROSSPOSTED_CODE) {
        onAlreadyCrossposted(channelId);
      }
      if (INVALID_REQUEST_STATUSES.has(error.status)) {
        onInvalidRequest(error.status);
      }
      res.statusCode = error.status;
      if (error.rawError) {
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(error.rawError));
      }
    } else if (error instanceof HTTPError) {
      if (INVALID_REQUEST_STATUSES.has(error.status)) {
        onInvalidRequest(error.status);
      }
      res.statusCode = error.status;
    } else if (error instanceof Error && error.name === 'AbortError') {
      res.statusCode = 504;
      res.statusMessage = 'Upstream timed out';
    } else {
      logger.error({ event: 'proxy.unhandled_error', err: error, fullRoute, method });
      res.statusCode = 500;
    }
  } finally {
    res.end();
  }
};

const server = createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    logger.error({ event: 'proxy.fatal', err: error });
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end();
    }
  });
});

server.listen(env.PORT, () => {
  logger.info({ event: 'proxy.listening', port: env.PORT }, `Discord proxy listening on port ${env.PORT}`);
});

const shutdown = () => {
  logger.info({ event: 'proxy.shutdown' });
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
