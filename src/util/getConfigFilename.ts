export default () => {
  return `config.${process.env.NODE_ENV ?? 'development'}.json`;
};
