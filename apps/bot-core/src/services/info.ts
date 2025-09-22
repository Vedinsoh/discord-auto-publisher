import { Data } from 'data/index.js';

type InfoData = {
  size: number;
  pending: number;
  channelQueues: number;
  paused: boolean;
  rateLimitsSize: number;
};

const get = async (): Promise<InfoData | null> => {
  const res = await Data.API.Bot.getInfo();
  const body = (await res.json()) as { data?: InfoData };

  if (!body.data) return null;

  return body.data;
};

export const Info = {
  get,
};
