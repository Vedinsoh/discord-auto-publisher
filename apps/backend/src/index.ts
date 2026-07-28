import { env } from '@ap/config';
import { runMigrations } from '@ap/database';
import {
  createApiRateLimit,
  createCorsMiddleware,
  createDiscordAuth,
  createErrorHandler,
  createHealthRoute,
  createRequestLogger,
  createRequireGuildPermission,
} from '@ap/express';
import { App } from 'app/index.js';
import { runGuildReconcile, startGuildReconcile } from 'cron/guildReconcile.js';
import {
  runSubscriptionReconcile,
  startSubscriptionReconcile,
} from 'cron/subscriptionReconcile.js';
import { Data } from 'data/index.js';
import express from 'express';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

// Create the Express app
const app = express();

// Request logger (applies to all routes)
app.use(...createRequestLogger(env.isDevelopment));

// Paddle webhook route (needs raw body BEFORE express.json())
app.use('/webhooks/paddle', express.raw({ type: 'application/json' }), App.Routes.Api.Webhooks);

// JSON parser for all remaining routes
app.use(express.json());

// Existing Docker-internal routes (unchanged)
app.use('/channel/:channelId', App.Routes.Channel);
app.use('/guild/:guildId', App.Routes.Guild);
app.use('/info', App.Routes.Info);
app.use('/internal', App.Routes.Internal);
app.get('/health', createHealthRoute);

// Public API routes (with CORS + Discord auth)
const discordAuth = createDiscordAuth(Data.Drivers.Redis.DiscordAuth, logger);
const requireGuildPermission = createRequireGuildPermission(Data.Drivers.Redis.DiscordAuth, logger);
const readRateLimit = createApiRateLimit(Data.Drivers.Redis.DiscordAuth, 60_000, 60);

app.use('/api', createCorsMiddleware());
app.use('/api/user', discordAuth, readRateLimit, App.Routes.Api.User);
app.use(
  '/api/guild/:guildId',
  discordAuth,
  requireGuildPermission,
  readRateLimit,
  App.Routes.Api.GuildApi
);

// Error handlers
app.use(...createErrorHandler());

// Run DB migrations before starting
await runMigrations();

// Sync cache on startup to ensure consistency between DB and cache
await Services.Channels.initialize();

// Start the server
const server = app.listen('8080', async () => {
  const { NODE_ENV } = env;
  logger.info(`Server (${NODE_ENV}) running on port http://localhost:8080`);
});

// Start guild presence reconcile cron (both editions, 03:30 — before
// subscription reconcile so its bot-present backstop reads fresh presence)
startGuildReconcile();

// Start subscription reconcile cron
startSubscriptionReconcile();

// Startup reconcile: repairs presence state lost while down — Discord never
// re-emits a missed join, so without this a DB reset or downtime during an
// invite leaves the dashboard wrong until the 03:30 cron (errors are handled
// and alerted inside). Subscription reconcile runs after so its bot-present
// backstop reads fresh presence (same ordering as the 03:30/04:00 crons)
void runGuildReconcile().then(runSubscriptionReconcile);

// Gracefully handle server shutdown
const onCloseSignal = async () => {
  server.close(() => {
    logger.info('Server closed');
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

// Handle close signals
process.on('SIGINT', onCloseSignal);
process.on('SIGTERM', onCloseSignal);
