import express from 'express';

import { App } from '@/app';
import { Data } from '@/data';
import errorHandler from '@/middlewares/errorHandler';
import requestLogger from '@/middlewares/requestLogger';
import { Services } from '@/services';
import { env } from '@/utils/config';

// Create the Express app
const app = express();

// Middlewares
app.use(requestLogger);
app.use(express.json());

// Routes
app.use('/crosspost', App.Routes.Crosspost);
app.use('/presence', App.Routes.Presence);
app.use('/info', App.Routes.Info);

// Error handlers
app.use(errorHandler());

// Start the server
const server = app.listen(env.REST_PORT, async () => {
  const { NODE_ENV, REST_HOST: HOST, REST_PORT: PORT } = env;
  Services.Logger.info(`Server (${NODE_ENV}) running on port http://${HOST}:${PORT}`);
});

// Gracefully handle server shutdown
const onCloseSignal = async () => {
  await Data.Drivers.MongoDB.client.close();

  server.close(() => {
    Services.Logger.info('Server closed');
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

// Handle close signals
process.on('SIGINT', onCloseSignal);
process.on('SIGTERM', onCloseSignal);
