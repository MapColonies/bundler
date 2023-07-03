import { RepositoryId } from '@map-colonies/bundler-common';
import { GithubAsset, GithubRepository, MediaType, RepositoryType } from './types';

export interface IGithubClient {
  downloadRepository: (id: Required<RepositoryId>, mediaType?: MediaType) => Promise<ArrayBuffer>;
  listRepositories: (org: string, type?: RepositoryType, filter?: RepositoryFilter) => Promise<GithubRepository[]>;
  listRepositoriesGenerator: (org: string, type?: RepositoryType, filter?: RepositoryFilter, perPage?: number) => AsyncGenerator<GithubRepository[]>;
  listAssets: (id: Required<RepositoryId>) => Promise<GithubAsset[]>;
  ping: () => Promise<void>;
}

export interface RepositoryFilter {
  topics?: string[];
  archived?: boolean;
}
