import 'dotenv/config';
import { createServer } from 'node:http';
import process from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { DiscordAPIError, HTTPError, RateLimitError, REST, type RequestMethod, type RouteLike } from '@discordjs/rest';

process.on('SIGINT', () => process.exit(0));

const api = new REST({ rejectOnRateLimit: () => true, retries: 0 }).setToken(process.env.DISCORD_TOKEN!);

const server = createServer(async (req, res) => {
  const { method, url } = req;

  if (!method || !url) {
    res.statusCode = 400;
    res.end();
    return;
  }

  // Health check endpoint
  const parsedUrl = new URL(url, 'http://noop');
  if (parsedUrl.pathname === '/health') {
    res.statusCode = 200;
    res.end('OK');
    return;
  }

  // Strip /api and version prefix to get the Discord API route
  const fullRoute = parsedUrl.pathname.replace(/^\/api(\/v\d+)?/, '') as RouteLike;

  const headers: Record<string, string> = {};
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'];
  }
  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization;
  }
  if (req.headers['x-audit-log-reason']) {
    headers['x-audit-log-reason'] = req.headers['x-audit-log-reason'] as string;
  }

  try {
    const discordResponse = await api.queueRequest({
      body: req,
      fullRoute,
      method: method as RequestMethod,
      auth: false,
      passThroughBody: true,
      query: parsedUrl.searchParams,
      headers,
    });

    // Forward successful response with all headers (including rate limit headers
    // so clients can build per-channel bucket state for proper parallel processing)
    res.statusCode = discordResponse.status;
    for (const [header, value] of discordResponse.headers) {
      res.setHeader(header, value);
    }

    if (discordResponse.body) {
      await pipeline(
        discordResponse.body instanceof Readable ? discordResponse.body : Readable.fromWeb(discordResponse.body),
        res,
      );
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      res.statusCode = 429;
      // Forward all bucket headers so clients can update their rate limit state correctly.
      // X-RateLimit-Reset-After is critical: without it clients can't update this.reset,
      // causing getTimeToReset() to return stale values from the last successful response.
      res.setHeader('Retry-After', String(error.retryAfter / 1_000));
      res.setHeader('X-RateLimit-Reset-After', String(error.retryAfter / 1_000));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Limit', String(error.limit));
      res.setHeader('X-RateLimit-Bucket', error.hash);
      res.setHeader('X-RateLimit-Scope', error.scope);
      if (error.global) {
        res.setHeader('X-RateLimit-Global', 'true');
      }
      res.setHeader('Content-Type', 'application/json');
      res.write(
        JSON.stringify({
          message: 'You are being rate limited.',
          retry_after: error.retryAfter / 1_000,
          global: error.global,
        }),
      );
    } else if (error instanceof DiscordAPIError || error instanceof HTTPError) {
      res.statusCode = error.status;
      if ('rawError' in error) {
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(error.rawError));
      }
    } else if (error instanceof Error && error.name === 'AbortError') {
      res.statusCode = 504;
      res.statusMessage = 'Upstream timed out';
    } else {
      throw error;
    }
  } finally {
    res.end();
  }
});

const port = Number.parseInt(process.env.PORT ?? '8080', 10);
server.listen(port, () => console.log(`Discord proxy listening on port ${port}`));
