import { client } from 'lib/shard.js';

export const respawnClusters = () => {
  client.cluster.respawnAll();
};
