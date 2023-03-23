import urlRegex from 'url-regex-safe';
import client from '#client';
import config from '#config';
import type { ReceivedMessage } from '#types/MessageTypes';

const { urlDetection } = config;

const handleCrosspost = (message: ReceivedMessage) => {
  if (urlDetection.enabled && message.content) {
    const hasUrl = urlRegex({ strict: true, localhost: false }).test(message.content);
    const hasEmbeds = !!message.embeds.length;

    if (hasUrl && !hasEmbeds) {
      return client.crosspostQueue.add(message, { hasUrl: true });
    }
  }

  return client.crosspostQueue.add(message);
};

export default handleCrosspost;
