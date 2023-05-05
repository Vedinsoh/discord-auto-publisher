import urlRegex from 'url-regex-safe';
import config from '#config';
import crosspost from '#crosspost/crosspost';
import type { ReceivedMessage } from '#types/MessageTypes';
import { secToMs } from '#util/timeConverters';

const { urlDetection } = config;

const preconditionRun = (message: ReceivedMessage) => {
  if (urlDetection.enabled && message.content) {
    const hasUrl = urlRegex({ strict: true, localhost: false }).test(message.content);
    const hasEmbeds = Boolean(message.embeds.length);

    if (hasUrl && !hasEmbeds) {
      setTimeout(() => {
        crosspost(message);
      }, secToMs(config.urlDetection.deferTimeout));
      return;
    }
  }

  return crosspost(message);
};

export default preconditionRun;
