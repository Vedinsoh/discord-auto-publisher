import { Data } from '#data';

// TODO types
const get = async () => {
  const res = await Data.API.REST.getInfo();
  const body = (await res.json()) as any;

  if (!body.data) return null;

  return body.data as {
    size: number;
    pending: number;
    channelQueues: number;
    paused: boolean;
  };
};

export const Info = {
  get,
};
