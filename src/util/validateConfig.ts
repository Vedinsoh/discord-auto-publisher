import { ZodError } from 'zod';
import ConfigSchema from '#schemas/ConfigSchema';

const stringifyIssues = (error: ZodError) => {
  const { issues } = error;
  return issues.map((issue) => `    ${issue.path}: ${issue.message}`).join('\n');
};

export default (config: unknown) => {
  try {
    ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Invalid config:\n${stringifyIssues(error)}`);
    }
  }
};
