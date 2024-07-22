/* eslint-disable no-var */

import { Services } from '@/services';

export declare global {
  declare module globalThis {
    var messagesQueue: Services.MessagesQueue;
  }
}
