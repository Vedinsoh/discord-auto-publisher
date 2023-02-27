import glob from 'glob';
import path from 'node:path';

const { sync } = glob;

const normalizePath = (route: string) => route.replace(/[\\/]+/g, '/');

export const getFilePaths = (route: string) => {
  return sync(normalizePath(`${process.env.PWD}/dist/${route}`));
};

export const importFile = async (filePath: string) => {
  const file = await import(`file://${path.resolve(filePath)}`);
  return file.default;
};
