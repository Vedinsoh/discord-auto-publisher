const getConfigFilename = () => {
  return `config.${process.env.NODE_ENV ?? 'development'}.json`;
};

export default getConfigFilename;
