import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import RedisStore, { type RedisReply } from 'rate-limit-redis';

type RedisLike = {
  call(...args: (string | number)[]): Promise<unknown>;
};

export function createApiRateLimit(redisClient: RedisLike, windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => req.discordUser?.id ?? ipKeyGenerator(req.ip ?? '', 56),
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.call(...args) as Promise<RedisReply>,
    }),
  });
}
