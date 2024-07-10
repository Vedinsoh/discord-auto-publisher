import express, { Express } from 'express';
import { pino } from 'pino';

import { App } from '@/app';
import errorHandler from '@/middlewares/errorHandler';
import requestLogger from '@/middlewares/requestLogger';

const logger = pino({ name: 'REST' });
const app: Express = express();

// Request logging
app.use(requestLogger);

// Routes
app.use('/crosspost', App.Routes.Crosspost);
app.use('/blacklist', App.Routes.Blacklist);

// Error handlers
app.use(errorHandler());

export { app, logger };
