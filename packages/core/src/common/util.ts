import { join } from 'path';
import { writeFile } from 'fs/promises';
import { GithubClient } from '@map-colonies/bundler-github';
import { GITHUB_ORG, RepositoryId, NAME_TO_REF_DELIMITER, OWNER_TO_NAME_DELIMITER } from '@map-colonies/bundler-common';
import { RepositoryProvider } from '../repositoryProvider/repositoryProvider';
import { DEFAULT_BRANCH, DEFAULT_BUNDLER_DIR, DEFAULT_BUNDLER_OUTPUT, TEMP_DIR } from '../bundler/constants';
import { DefaultBundlerOptions } from '../bundler/interfaces';

export const provideDefaultOptions = (): DefaultBundlerOptions => {
  return {
    workdir: join(TEMP_DIR, DEFAULT_BUNDLER_DIR),
    outputPath: join(TEMP_DIR, DEFAULT_BUNDLER_DIR, DEFAULT_BUNDLER_OUTPUT),
    isDebugMode: false,
    cleanupMode: 'on-the-fly',
    verbose: false,
    githubClient: new GithubClient(),
    provider: new RepositoryProvider(),
  };
};

export const repoIdToRepoStr = (repo: RepositoryId): string => {
  return `${repo.owner ?? GITHUB_ORG}${OWNER_TO_NAME_DELIMITER}${repo.name}${NAME_TO_REF_DELIMITER}${repo.ref ?? DEFAULT_BRANCH}`;
};

export const stringifyRepositoryId = (id: RepositoryId): string => {
  return `${id.owner ?? GITHUB_ORG}-${id.name}-${id.ref ?? DEFAULT_BRANCH}`;
};

export const writeBuffer = async (data: ArrayBufferLike, path: string): Promise<void> => {
  const buffer = Buffer.from(data);
  await writeFile(path, buffer);
};
