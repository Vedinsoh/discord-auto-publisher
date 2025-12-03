import { Counter } from 'services/crosspost/counter.js';
import { Handler } from 'services/crosspost/handler.js';
import { MessagesQueue } from 'services/queue/messagesQueue.js';

export const Crosspost = {
  Counter,
  Handler,
  Queue: MessagesQueue,
};
