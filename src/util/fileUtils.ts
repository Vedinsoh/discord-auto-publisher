import { sync } from 'glob';

// Normalized dirname
const dirname = __dirname.replace(/\\/g, '/');

export const getFiles = (pattern: string) => sync(`${dirname}/${pattern}`);

export const importFile = async (filePath: string) => (await import(filePath))?.default;
