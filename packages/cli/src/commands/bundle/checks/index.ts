import { CheckError } from '../../../common/errors';
import { CheckFunc } from '../../../wrappers/check';
import { BundleArguments } from '../bundleFactory';
import { MAX_DELIMITER_OCCURRENCES, NAME_TO_REF_DELIMITER, OWNER_TO_NAME_DELIMITER } from '../constants';

interface BundleArgumentsWhileBuild extends Omit<BundleArguments, 'repository' | 'repositories'> {
  repository?: string;
  repositories?: string[];
}

export const repoProvidedCheck: CheckFunc<BundleArgumentsWhileBuild> = (args) => {
  if (args.repository === undefined && args.repositories === undefined) {
    throw new CheckError('exactly one of repository or repositories must be provided', ['repository', 'repositories'], undefined);
  }
  return true;
};

export const repoValidityCheck: CheckFunc<BundleArgumentsWhileBuild> = (args) => {
  const isRepoValid = (repoStr: string): boolean => {
    return ![OWNER_TO_NAME_DELIMITER, NAME_TO_REF_DELIMITER].some((delimiter) => repoStr.split(delimiter).length > MAX_DELIMITER_OCCURRENCES);
  };

  let value: string | string[];
  let argument: string;

  if (args.repository !== undefined) {
    value = args.repository;
    argument = 'repository';
    if (!isRepoValid(value)) {
      throw new CheckError('repository must be in the format of {owner}/{name}@{ref}', argument, value);
    }
  } else {
    value = args.repositories as string[];
    argument = 'repositories';
    if (value.some((repo) => !isRepoValid(repo))) {
      throw new CheckError('each repository must be in the format of {owner}/{name}@{ref}', argument, value);
    }
  }

  return true;
};
