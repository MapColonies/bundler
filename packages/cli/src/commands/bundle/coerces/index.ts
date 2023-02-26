import { readFileSync } from 'fs';
import { DEFAULT_BRANCH, Repository } from '@bundler/core';
import { GITHUB_ORG } from '@bundler/common';
import { RepositoryId } from '@bundler/github';
import { CheckError } from '../../../common/errors';
import { isRepoValid } from '../../../validation/formats';
import { INPUT_BUNDLE_REQUEST_SCHEMA } from '../../../validation/schemas';
import { validate } from '../../../validation/validator';
import { CoerceFunc } from '../../../wrappers/coerce';
import { InputFileBundleRequest } from '../bundleFactory';
import { NAME_TO_REF_DELIMITER, OWNER_TO_NAME_DELIMITER } from '../constants';

const repoStrToRepoId = (repo: string): RepositoryId => {
  const [ownerAndName, ref] = repo.split(NAME_TO_REF_DELIMITER);
  const [name, owner] = ownerAndName.split(OWNER_TO_NAME_DELIMITER).reverse();
  return {
    name,
    owner: (owner as string | undefined) ?? GITHUB_ORG,
    ref: (ref as string | undefined) ?? DEFAULT_BRANCH
};
};

export const repositoryCoerce: CoerceFunc<string, RepositoryId> = (arg) => {
  if (arg === undefined) {
    return;
  }

  if (!isRepoValid(arg)) {
    throw new CheckError('repository must be in the format of {owner?}/{name}@{ref}', 'repository', arg);
  }

  return repoStrToRepoId(arg);
};

export const repositoriesCoerce: CoerceFunc<string[], RepositoryId[]> = (arg) => {
  if (arg === undefined) {
    return;
  }

  const repos = [...new Set(arg)];

  if (repos.some((repo) => !isRepoValid(repo))) {
    throw new CheckError('repository must be in the format of {owner?}/{name}@{ref}', 'repositories', arg);
  }

  return repos.map(repoStrToRepoId);
};

export const inputCoerce: CoerceFunc<string, Repository[]> = (path) => {
  if (path === undefined) {
    return;
  }

  const inputContent = readFileSync(path, 'utf-8');
  const inputContentAsJson: unknown = JSON.parse(inputContent);
  const validationResponse = validate<InputFileBundleRequest[]>(inputContentAsJson, INPUT_BUNDLE_REQUEST_SCHEMA);

  if (!validationResponse.isValid || validationResponse.content === undefined) {
    const { errors } = validationResponse;
    throw new CheckError(errors ?? 'argument validation failure', 'input', path);
  }

  return validationResponse.content.map((r) => ({ ...r, id: repoStrToRepoId(r.repository) }));
};
