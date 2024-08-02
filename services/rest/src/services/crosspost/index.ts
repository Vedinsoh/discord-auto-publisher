import { Counter } from './counter';
import { Handler } from './handler';
import { MessagesQueue } from './messagesQueue';

export const Crosspost = {
  Counter,
  Handler,
  Queue: MessagesQueue,
};
