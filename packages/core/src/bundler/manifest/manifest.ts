import { TAR_FORMAT, TAR_GZIP_ARCHIVE_FORMAT, RepositoryBundleRequest } from '@map-colonies/bundler-common';
import { SOURCE_CODE_ARCHIVE, TGZ_ARCHIVE_FORMAT } from '../constants';
import { BaseOutput, RepositoryProfile } from '../interfaces';
import { repoIdToRepoStr, stringifyRepositoryId } from '../../common/util';
import { BundleDirs } from '../enums';

type OptionalBundleDirs = {
  [key in BundleDirs]?: string[];
};

export interface BundleOutputTree {
  [repositoryId: string]: (OptionalBundleDirs | string)[];
}

export interface RepositoriesManifest {
  output: BundleOutputTree;
  input: RepositoryBundleRequest[];
}

export type Manifest = BaseOutput & RepositoriesManifest;

export const manifestRepositories = (repositories: RepositoryProfile[]): RepositoriesManifest => {
  const outputTree: BundleOutputTree = {};

  const repositoryParams = repositories.map((repo) => {
    const images: string[] = [];
    const assets: string[] = [];
    const helm: string[] = [];

    repo.tasks.forEach((task) => {
      if (task.kind === 'Dockerfile' || task.kind === 'migrations.Dockerfile') {
        images.push(`${task.name}.${TAR_FORMAT}`);
      } else if (task.kind === 'asset') {
        assets.push(task.name);
      } else {
        helm.push(`${task.name}.${TGZ_ARCHIVE_FORMAT}`);
      }
    });

    const repoOutput = [`${SOURCE_CODE_ARCHIVE}.${TAR_GZIP_ARCHIVE_FORMAT}`, { images: images }, { assets: assets }, { helm: helm }];

    const repository = repoIdToRepoStr(repo.id);
    const repositoryDir = stringifyRepositoryId(repo.id);
    outputTree[repositoryDir] = repoOutput;

    return {
      repository,
      buildImageLocally: repo.buildImageLocally,
      includeMigrations: repo.includeMigrations,
      includeAssets: repo.includeAssets,
      includeHelmPackage: repo.includeHelmPackage,
      buildArgs: repo.buildImageLocally === true ? repo.buildArgs : undefined,
    };
  });

  return {
    output: outputTree,
    input: repositoryParams,
  };
};
