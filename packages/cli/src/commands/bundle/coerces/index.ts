import { ILogger } from '@bundler/core/src/common/types';
import { RepositoryId } from '@bundler/github';
import { CheckError } from '../../../common/errors';
import { isRepoValid, repoStrToRepoId } from '../helpers';

export type CoerceFunc<T, C> = (arg: T) => C;

export const coerceWrapper = <T, C>(coerce: CoerceFunc<T, C>, logger?: ILogger): CoerceFunc<T, C> => {
  const wrapper: CoerceFunc<T, C> = (arg) => {
    try {
      return coerce(arg);
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

export const repositoryCoerce: CoerceFunc<string, RepositoryId> = (arg) => {
  console.log('repositoryCoerce');
  if (!isRepoValid(arg)) {
    throw new CheckError('repository must be in the format of {owner}/{name}@{ref}', 'repository', arg);
  }
  return repoStrToRepoId(arg);
};

export const repositoriesCoerce: CoerceFunc<string[], RepositoryId[]> = (arg) => {
  if (arg.some((repo) => !isRepoValid(repo))) {
    throw new CheckError('repository must be in the format of {owner}/{name}@{ref}', 'repositories', arg);
  }

  return arg.map((repo) => repoStrToRepoId(repo));
};
