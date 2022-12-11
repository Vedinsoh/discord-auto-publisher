import client from '#client';

const shutdown = async () => {
  await client.cluster.broadcastEval((c) => c.destroy());
  process.exit(0);
};

export default shutdown;
