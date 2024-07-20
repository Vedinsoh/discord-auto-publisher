/* eslint-disable no-var */

import { MessagesQueue } from './services/messagesQueue';

export declare global {
  declare module globalThis {
    var messagesQueue: MessagesQueue;
  }
}
