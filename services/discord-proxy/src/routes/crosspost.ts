import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ServerResponse } from 'node:http';
import { DiscordAPIError, HTTPError, RateLimitError, type REST, type RequestMethod, type RouteLike } from '@discordjs/rest';
import { logger } from '../logger.js';
import { CrosspostsCounter, InvalidRequestsCounter } from '../redis/index.js';

const ALREADY_CROSSPOSTED_CODE = 40033;
const INVALID_REQUEST_STATUSES = new Set([401, 403, 429]);

const writeRateLimitHeaders = (res: ServerResponse, error: RateLimitError) => {
  res.setHeader('Retry-After', String(error.retryAfter / 1_000));
  res.setHeader('X-RateLimit-Reset-After', String(error.retryAfter / 1_000));
  res.setHeader('X-RateLimit-Remaining', '0');
  res.setHeader('X-RateLimit-Limit', String(error.limit));
  res.setHeader('X-RateLimit-Bucket', error.hash);
  res.setHeader('X-RateLimit-Scope', error.scope);
  if (error.global) res.setHeader('X-RateLimit-Global', 'true');
};

const writeRateLimitBody = (res: ServerResponse, retryAfterSec: number, global: boolean) => {
  res.setHeader('Content-Type', 'application/json');
  res.write(
    JSON.stringify({ message: 'You are being rate limited.', retry_after: retryAfterSec, global }),
  );
};

export const handleCrosspost = async (
  api: REST,
  channelId: string,
  messageId: string,
  fullRoute: RouteLike,
  method: RequestMethod,
  res: ServerResponse,
) => {
  // CF-ban-prevention shed
  if (await InvalidRequestsCounter.isOverThreshold()) {
    logger.warn({ event: 'crosspost.shed.cf_budget', channelId });
    res.statusCode = 503;
    res.setHeader('Retry-After', '60');
    res.end();
    return;
  }

  // Cross-shard sublimit pre-check
  if (await CrosspostsCounter.isOverLimit(channelId)) {
    logger.debug({ event: 'crosspost.blocked.counter', channelId });
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const discordResponse = await api.queueRequest({
      fullRoute,
      method,
      auth: true,
    });

    if (discordResponse.status >= 200 && discordResponse.status < 300) {
      void CrosspostsCounter.increment(channelId);
      logger.debug({ event: 'crosspost.success', channelId, messageId });
    }

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
      if (error.scope === 'shared' && !error.global) {
        void CrosspostsCounter.lockSublimit(channelId, error.retryAfter / 1_000);
        logger.info({ event: 'crosspost.sublimit', channelId, retryAfterSec: error.retryAfter / 1_000 });
      }
      // Per Discord docs, shared 429s do not count toward the invalid-request limit
      if (error.scope !== 'shared') void InvalidRequestsCounter.increment(429);

      res.statusCode = 429;
      writeRateLimitHeaders(res, error);
      writeRateLimitBody(res, error.retryAfter / 1_000, error.global);
      res.end();
      return;
    }

    if (error instanceof DiscordAPIError) {
      if (error.code === ALREADY_CROSSPOSTED_CODE) {
        void CrosspostsCounter.increment(channelId);
        logger.debug({ event: 'crosspost.already', channelId });
      }
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

    logger.error({ event: 'crosspost.unhandled_error', err: error, channelId, messageId });
    res.statusCode = 500;
    res.end();
  }
};
