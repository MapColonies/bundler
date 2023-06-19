import { readFileSync } from 'fs';
import { DEFAULT_BRANCH } from '@map-colonies/bundler-core';
import {
  GITHUB_ORG,
  NAME_TO_REF_DELIMITER,
  OWNER_TO_NAME_DELIMITER,
  Repository,
  RepositoryBundleRequest,
  RepositoryId,
  TAR_FORMAT,
  TAR_GZIP_ARCHIVE_FORMAT,
} from '@map-colonies/bundler-common';
import { load } from 'js-yaml';
import { CheckError } from '../../../common/errors';
import { isRepoValid } from '../../../validation/formats';
import { HAS_BUNDLE_REQUEST_SCHEMA, BUNDLE_REQUEST_SCHEMA, HasBundleRequest } from '../../../validation/schemas';
import { validate, ValidationResponse } from '../../../validation/validator';
import { CoerceFunc } from '../../../wrappers/coerce';

type ValidationFunc<T> = () => ValidationResponse<T>;

const repoStrToRepoId = (repo: string): RepositoryId => {
  const [ownerAndName, ref] = repo.split(NAME_TO_REF_DELIMITER);
  const [name, owner] = ownerAndName.split(OWNER_TO_NAME_DELIMITER).reverse();
  return {
    name,
    owner: (owner as string | undefined) ?? GITHUB_ORG,
    ref: (ref as string | undefined) ?? DEFAULT_BRANCH,
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

  const errors: string[] = [];
  const inputContent = readFileSync(path, 'utf-8');

  const jsonValidation: ValidationFunc<RepositoryBundleRequest[]> = () => {
    try {
      const inputContentAsJson: unknown = JSON.parse(inputContent);
      return validate<RepositoryBundleRequest[]>(inputContentAsJson, BUNDLE_REQUEST_SCHEMA);
    } catch (e) {
      return { isValid: false, errors: 'json validation failure', content: undefined };
    }
  };

  const yamlValidation: ValidationFunc<HasBundleRequest> = () => {
    try {
      const inputContentFromYamlAsJson = load(inputContent, { json: true });
      return validate<HasBundleRequest>(inputContentFromYamlAsJson, HAS_BUNDLE_REQUEST_SCHEMA);
    } catch (e) {
      return { isValid: false, errors: 'yaml validation failure', content: undefined };
    }
  };

  for (const validation of [jsonValidation, yamlValidation]) {
    const response = validation();
    if (!response.isValid) {
      errors.push(response.errors ?? 'validation failure');
      continue;
    }

    if (Array.isArray(response.content)) {
      return response.content.map((r) => ({ ...r, id: repoStrToRepoId(r.repository) }));
    }

    return response.content?.input.map((r) => ({ ...r, id: repoStrToRepoId(r.repository) }));
  }

  throw new CheckError(errors.join('\n'), 'input', path);
};

export const outputCoerce: CoerceFunc<string, string> = (path) => {
  if (path === undefined) {
    return;
  }

  return path.endsWith(`.${TAR_GZIP_ARCHIVE_FORMAT}`) || path.endsWith(`.${TAR_FORMAT}`) ? path : `${path}.${TAR_GZIP_ARCHIVE_FORMAT}`;
};
