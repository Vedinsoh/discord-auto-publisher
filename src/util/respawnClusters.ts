import client from '#client';

export default () => {
  client.cluster.respawnAll();
};
