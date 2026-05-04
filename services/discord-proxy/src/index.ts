import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import process from 'node:process';
import { REST, type RequestMethod, type RouteLike } from '@discordjs/rest';
import { env } from './config.js';
import { logger } from './logger.js';
import { rejectOnCrosspostRateLimit } from './rateLimits/rejectPredicate.js';
import { CrosspostsCounter, InvalidRequestsCounter } from './redis/index.js';
import { handleCrosspost } from './routes/crosspost.js';
import { handlePassthrough } from './routes/passthrough.js';

const CROSSPOST_ROUTE = /^\/channels\/(\d{17,19})\/messages\/(\d{17,19})\/crosspost$/;

const api = new REST({
  rejectOnRateLimit: rejectOnCrosspostRateLimit,
  retries: 0,
}).setToken(env.DISCORD_TOKEN);

const handleHealth = (res: ServerResponse) => {
  res.statusCode = 200;
  res.end('OK');
};

const handleInfo = async (res: ServerResponse) => {
  try {
    const [channelsCount, invalidRequests] = await Promise.all([
      CrosspostsCounter.getSize(),
      InvalidRequestsCounter.getCount(),
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
        invalidRequests,
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

const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
  const { method, url } = req;
  if (!method || !url) {
    res.statusCode = 400;
    res.end();
    return;
  }

  const parsedUrl = new URL(url, 'http://noop');
  if (parsedUrl.pathname === '/health') return handleHealth(res);
  if (parsedUrl.pathname === '/info') return handleInfo(res);

  const fullRoute = parsedUrl.pathname.replace(/^\/api(\/v\d+)?/, '') as RouteLike;
  const crosspostMatch = method === 'POST' ? CROSSPOST_ROUTE.exec(fullRoute) : null;

  if (crosspostMatch) {
    const [, channelId, messageId] = crosspostMatch;
    return handleCrosspost(api, channelId, messageId, fullRoute, method as RequestMethod, res);
  }

  return handlePassthrough(api, req, res, fullRoute, method as RequestMethod, parsedUrl.searchParams);
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
