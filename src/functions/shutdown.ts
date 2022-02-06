import client from '#client';

export default () => {
  client.cluster.broadcastEval(cluster => cluster.client.destroy());
  process.exit(0); // TODO
};
