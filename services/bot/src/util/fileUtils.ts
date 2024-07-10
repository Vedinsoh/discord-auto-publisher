import { sync } from 'glob';
import { resolve } from 'node:path';

const normalizePath = (route: string) => route.replace(/[\\/]+/g, '/');

export const getFilePaths = (route: string) => {
  return sync(normalizePath(`${process.env.PWD}/dist/${route}`));
};

export const importFile = async (filePath: string) => {
  const file = await import(`file://${resolve(filePath)}`);
  return file.default;
};
