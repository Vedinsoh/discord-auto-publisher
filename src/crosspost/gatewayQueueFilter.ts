import { RateLimitQueueFilter, RequestMethod } from 'discord.js';
import routes from '#constants/routes';

const gatewayQueueFilter: RateLimitQueueFilter = (data) => {
  const isPostMethod = data.method.toUpperCase() === RequestMethod.Post;
  const isCrosspostRoute = routes.crosspost === data.route;
  const isGlobal = data.global;

  return isPostMethod && isCrosspostRoute && !isGlobal;
};

export default gatewayQueueFilter;
