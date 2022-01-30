import client from '#client';

export default () => {
  client.destroy();
  process.exit(0);
};
