import { createErrorHandler, createHealthRoute, createRequestLogger } from '@ap/express';
import { App } from 'app/index.js';
import express from 'express';
import { env } from 'lib/config/env.js';
import { Services } from 'services/index.js';
import { logger } from 'utils/logger.js';

// Create the Express app
const app = express();

// Middlewares
app.use(...createRequestLogger(env.isDevelopment));
app.use(express.json());

// Routes
app.use('/channel/:channelId', App.Routes.Channel);
app.use('/guild/:guildId', App.Routes.Guild);
app.use('/info', App.Routes.Info);
app.get('/health', createHealthRoute);

// Error handlers
app.use(...createErrorHandler());

// Sync cache on startup to ensure consistency between DB and cache
await Services.Channels.initialize();

// Start the server
const server = app.listen('8080', async () => {
  const { NODE_ENV } = env;
  logger.info(`Server (${NODE_ENV}) running on port http://localhost:8080`);
});

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
