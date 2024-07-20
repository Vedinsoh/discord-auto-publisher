import express from 'express';

import { App } from '@/app';
import errorHandler from '@/middlewares/errorHandler';
import requestLogger from '@/middlewares/requestLogger';
import { Services } from '@/services';
import { env } from '@/utils/config';

// Create the Express app
const app = express();

// Request logging
app.use(requestLogger);

// Routes
app.use('/crosspost', App.Routes.Crosspost);
app.use('/blacklist', App.Routes.Blacklist);

// Error handlers
app.use(errorHandler());

// Start the server
const server = app.listen(env.REST_PORT, () => {
  const { NODE_ENV, REST_HOST: HOST, REST_PORT: PORT } = env;
  Services.Logger.info(`Server (${NODE_ENV}) running on port http://${HOST}:${PORT}`);
});

// Gracefully handle server shutdown
const onCloseSignal = () => {
  server.close(() => {
    Services.Logger.info('Server closed');
    process.exit();
  });
  setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
};

// Handle close signals
process.on('SIGINT', onCloseSignal);
process.on('SIGTERM', onCloseSignal);
