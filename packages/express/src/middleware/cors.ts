import { env } from '@ap/config';
import cors from 'cors';

export function createCorsMiddleware() {
  return cors({
    origin: env.WEB_APP_ORIGIN,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
