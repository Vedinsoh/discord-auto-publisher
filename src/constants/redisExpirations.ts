import { minToSec } from '#util/timeConverters';

const redisExpirations = {
  RATE_LIMITS: minToSec(5),
  SPAM_CHANNELS: minToSec(60),
};

export default redisExpirations;
