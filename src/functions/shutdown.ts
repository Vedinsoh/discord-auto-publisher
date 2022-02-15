import client from '#client';

export default async () => {
  await client.cluster.broadcastEval((c) => c.destroy());
  process.exit(0);
};
