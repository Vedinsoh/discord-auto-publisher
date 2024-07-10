import client from '#client';

const respawnClusters = () => {
  client.cluster.respawnAll();
};

export default respawnClusters;
