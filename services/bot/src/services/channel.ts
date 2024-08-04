import type { Message } from 'discord.js';

const fetch = async (channel: Message['channel']) => {
  // Get the channel data if it's partial
  if (channel.partial) {
    return await channel.fetch();
  }

  return channel;
};

export const Channel = { fetch };
