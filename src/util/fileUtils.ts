import { sync } from 'glob';

export const getFiles = (pattern: string) => sync(`${__dirname}/${pattern}`);

export const importFile = async (filePath: string) => (await import(filePath))?.default;
