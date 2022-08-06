import { sync } from 'glob';

// Normalized dirname
const normalizePath = (route: string) => route.replace(/[\\/]+/g, '/');

export const getFiles = (route: string) => {
  return sync(normalizePath(`${process.env.PWD}/${process.env.BASE_DIR}/${route}`));
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
export const importFile = (filePath: string) => require(filePath)?.default;
