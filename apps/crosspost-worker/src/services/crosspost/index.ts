import { MessagesQueue } from '../queue/messagesQueue.js';
import { Counter } from './counter.js';
import { Handler } from './handler.js';

export const Crosspost = {
  Counter,
  Handler,
  Queue: MessagesQueue,
};
