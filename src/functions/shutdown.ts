import client from '#client';

export default async () => {
  // TODO This is a bug with type definitions in discord-hybrid-sharding library
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await client.cluster.broadcastEval((c) => c.destroy());
  process.exit(0);
};
