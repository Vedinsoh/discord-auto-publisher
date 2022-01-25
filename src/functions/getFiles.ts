import { sync as getFiles } from 'glob';

export default (pattern: string) => {
  return getFiles(`${__dirname}/${pattern}`);
};
