import { client } from 'lib/shard.js';

export const shutdown = async () => {
  await client.cluster.broadcastEval(c => c.destroy());
  process.exit(0);
};
