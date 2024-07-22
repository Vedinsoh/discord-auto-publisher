/* eslint-disable no-var */

import { Services } from '@/services';

export declare global {
  declare module globalThis {
    var crosspostsCounter: Services.CrosspostsCounter;
    var messagesQueue: Services.MessagesQueue;
  }
}
