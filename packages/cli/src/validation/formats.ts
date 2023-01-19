import { Format } from 'ajv';

const REPOSITORY_REGEX = '^([\\w.-]+\\/[\\w.-]+(@[\\w.-]+)?)$|^([\\w.-]+(@[\\w.-]+)?)$|^([\\w.-]+\\/[\\w.-]+)$';

export const isRepoValid = (repoStr: string): boolean => {
  const repoRegex = new RegExp(REPOSITORY_REGEX);
  return repoRegex.test(repoStr);
};

export const formats: Record<string, Format> = {
  repository: {
    type: 'string',
    validate: isRepoValid,
  },
};
