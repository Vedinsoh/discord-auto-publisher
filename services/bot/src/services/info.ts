import { Data } from '#data';

const get = async () => {
  const res = await Data.API.REST.getInfo();
  const body = (await res.json()) as any;

  if (!body.data) return null;

  return body.data as {
    queue: {
      size: number;
      pending: number;
    };
    rateLimitsSize: number;
    channelsCount: number;
  };
};

export const Info = {
  get,
};
