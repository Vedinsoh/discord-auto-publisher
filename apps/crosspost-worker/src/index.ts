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
app.use('/enqueue', App.Routes.Enqueue);
app.use('/metrics', App.Routes.Metrics);
app.get('/health', createHealthRoute);

// Error handlers
app.use(...createErrorHandler());

// Start the server
const server = app.listen('8082', async () => {
  const { NODE_ENV } = env;
  Services.Logger.info(`Crosspost Worker (${NODE_ENV}) running on port http://localhost:8082`);
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
