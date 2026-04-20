import { config, env } from '@ap/config';
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
import { startSubscriptionAudit } from 'cron/subscriptionAudit.js';
import { Data } from 'data/index.js';
import express from 'express';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

// Create the Express app
const app = express();

// Request logger (applies to all routes)
app.use(...createRequestLogger(env.isDevelopment));

// Stripe webhook route (premium only, needs raw body BEFORE express.json())
if (config.isPremiumInstance) {
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), App.Routes.Api.Webhooks);
}

// JSON parser for all remaining routes
app.use(express.json());

// Existing Docker-internal routes (unchanged)
app.use('/channel/:channelId', App.Routes.Channel);
app.use('/guild/:guildId', App.Routes.Guild);
app.use('/info', App.Routes.Info);
app.get('/health', createHealthRoute);

// Public API routes (with CORS + Discord auth)
const discordAuth = createDiscordAuth(Data.Drivers.Redis.DiscordAuth);
const requireGuildPermission = createRequireGuildPermission(Data.Drivers.Redis.DiscordAuth);
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

// Internal API routes (Docker-internal, no auth, premium only)
if (config.isPremiumInstance) {
  app.use('/api/internal', App.Routes.Api.SubscriptionStatus);
}

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

// Start subscription audit cron (premium only)
if (config.isPremiumInstance) {
  startSubscriptionAudit();
}

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
