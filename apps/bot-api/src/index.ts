import { App } from 'app/index.js';
import { Data } from 'data/index.js';
import express from 'express';
import { env } from 'lib/config/env.js';
import errorHandler from 'middlewares/errorHandler.js';
import requestLogger from 'middlewares/requestLogger.js';
import { Services } from 'services/index.js';

// Create the Express app
const app = express();

// Middlewares
app.use(requestLogger);
app.use(express.json());

// Routes
app.use('/crosspost', App.Routes.Crosspost);
app.use('/presence', App.Routes.Presence);
app.use('/info', App.Routes.Info);
app.get('/health', App.Routes.Health);

// Error handlers
app.use(errorHandler());

// Start the server
const server = app.listen(env.REST_PORT, async () => {
  const { NODE_ENV, REST_HOST: HOST, REST_PORT: PORT } = env;
  Services.Logger.info(`Server (${NODE_ENV}) running on port http://${HOST}:${PORT}`);
});

// Gracefully handle server shutdown
const onCloseSignal = async () => {
  await Data.Drivers.MongoDB.client.close().then(() => {
    Services.Logger.info('MongoDB connection closed');
  });

  server.close(() => {
    Services.Logger.info('Server closed');
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

// Handle close signals
process.on('SIGINT', onCloseSignal);
process.on('SIGTERM', onCloseSignal);
