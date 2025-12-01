import { createErrorHandler, createHealthRoute, createRequestLogger } from '@ap/express';
import { App } from 'app/index.js';
import express from 'express';
import { env } from 'lib/config/env.js';
import { Services } from 'services/index.js';

// Create the Express app
const app = express();

// Middlewares
app.use(...createRequestLogger(env.isDevelopment));
app.use(express.json());

// Routes
app.use('/channel', App.Routes.Channel);
app.use('/guild', App.Routes.Guild);
app.use('/info', App.Routes.Info);
app.get('/health', createHealthRoute);

// Error handlers
app.use(...createErrorHandler());

// Sync cache on startup to ensure consistency between DB and cache
await Services.Channels.DB.syncCache();

// Start the server
const server = app.listen('8080', async () => {
  const { NODE_ENV } = env;
  Services.Logger.info(`Server (${NODE_ENV}) running on port http://localhost:8080`);
});

// Gracefully handle server shutdown
const onCloseSignal = async () => {
  server.close(() => {
    Services.Logger.info('Server closed');
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

// Handle close signals
process.on('SIGINT', onCloseSignal);
process.on('SIGTERM', onCloseSignal);
