import { ILogger } from '@bundler/core/src/common/types';
import { Arguments } from 'yargs';
import { CheckError } from '../../../common/errors';
import { BundleArguments } from '../bundleFactory';
import { MAX_DELIMITER_OCCURRENCES, NAME_TO_REF_DELIMITER, OWNER_TO_NAME_DELIMITER } from '../constants';

interface BundleArgumentsWhileBuild extends Omit<BundleArguments, 'repository' | 'repositories'> {
  repository?: string;
  repositories?: string[];
}

export type CheckFunc<T> = (args: Arguments<T>) => true;

export const checkWrapper =<T> (check: CheckFunc<T>, logger?: ILogger): CheckFunc<T> => {
  const wrapper: CheckFunc<T> = (args) => {
    try {
      return check(args);
    } catch (err) {
      if (err instanceof CheckError) {
        logger?.error({
          msg: err.message,
          argument: err.argument,
          received: err.received,
        });
      }
      throw err;
    }
  };
  return wrapper;
};

export const repoProvidedCheck: CheckFunc<BundleArgumentsWhileBuild> = (args) => {
  console.log('check');
  if (args.repository === undefined && args.repositories === undefined) {
    throw new CheckError('exactly one of repository or repositories must be provided', ['repository', 'repositories'], undefined);
  }
  return true;
};

export const repoValidityCheck: CheckFunc<BundleArgumentsWhileBuild> = (args) => {
  const isRepoValid = (repoStr: string): boolean => {
    return ![OWNER_TO_NAME_DELIMITER, NAME_TO_REF_DELIMITER].some(delimiter => repoStr.split(delimiter).length > MAX_DELIMITER_OCCURRENCES);
  }

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
