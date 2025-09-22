import { client } from 'shard.js';

export const respawnClusters = () => {
  client.cluster.respawnAll();
};
