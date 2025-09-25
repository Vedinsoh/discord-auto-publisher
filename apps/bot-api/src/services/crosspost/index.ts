import { Counter } from './counter.js';
import { Handler } from './handler.js';
import { MessagesQueue } from './messagesQueue.js';

export const Crosspost = {
  Counter,
  Handler,
  Queue: MessagesQueue,
};
