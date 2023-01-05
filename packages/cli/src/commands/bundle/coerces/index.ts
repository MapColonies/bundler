import { GITHUB_ORG, DEFAULT_BRANCH } from '@bundler/core';
import { RepositoryId } from '@bundler/github';
import { CheckError } from '../../../common/errors';
import { CoerceFunc } from '../../../wrappers/coerce';
import { MAX_DELIMITER_OCCURRENCES, NAME_TO_REF_DELIMITER, OWNER_TO_NAME_DELIMITER } from '../constants';

const isRepoValid = (repoStr: string): boolean => {
  return ![OWNER_TO_NAME_DELIMITER, NAME_TO_REF_DELIMITER].some((delimiter) => repoStr.split(delimiter).length > MAX_DELIMITER_OCCURRENCES + 1);
};

const repoStrToRepoId = (repo: string): RepositoryId => {
  const [ownerAndName, ref] = repo.split(NAME_TO_REF_DELIMITER);
  const [name, owner] = ownerAndName.split(OWNER_TO_NAME_DELIMITER).reverse();
  return { owner: (owner as string | undefined) ?? GITHUB_ORG, name, ref: (ref as string | undefined) ?? DEFAULT_BRANCH };
};

export const repositoryCoerce: CoerceFunc<string, RepositoryId> = (arg) => {
  if (!isRepoValid(arg)) {
    throw new CheckError('repository must be in the format of {owner}/{name}@{ref}', 'repository', arg);
  }

  return repoStrToRepoId(arg);
};

export const repositoriesCoerce: CoerceFunc<string[], RepositoryId[]> = (arg) => {
  const repos = [...new Set(arg)];

  if (repos.some((repo) => !isRepoValid(repo))) {
    throw new CheckError('repository must be in the format of {owner}/{name}@{ref}', 'repositories', arg);
  }

  return repos.map((repo) => repoStrToRepoId(repo));
};
