import rateLimit from 'express-rate-limit';
import RedisStore, { type SendCommandFn } from 'rate-limit-redis';

type RedisLike = {
  sendCommand(args: string[]): ReturnType<SendCommandFn>;
};

export function createApiRateLimit(redisClient: RedisLike, windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => req.discordUser?.id ?? req.ip ?? 'unknown',
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
  });
}
