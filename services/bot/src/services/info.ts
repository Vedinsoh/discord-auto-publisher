import { Data } from '#data';

const get = async () => {
  const res = await Data.API.Proxy.getInfo();
  const body = (await res.json()) as any;

  if (!body.data) return null;

  return body.data as {
    rest: {
      globalRemaining: number;
      handlers: number;
      activeHandlers: number;
      hashes: number;
      invalidRequests: {
        count: number;
        expiresInMs: number;
      };
    };
    queue: {
      waiting?: number;
      active?: number;
      delayed?: number;
      failed?: number;
      completed?: number;
    };
    sublimitCount: number;
    blockedCount: number;
  };
};

export const Info = {
  get,
};
