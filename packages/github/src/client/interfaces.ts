import { GithubAsset, GithubRepository, MediaType, RepositoryType } from './types';

export interface IGithubClient {
  downloadRepository: (id: Required<RepositoryId>, mediaType?: MediaType) => Promise<ArrayBuffer>;
  listRepositories: (org: string, type?: RepositoryType, filter?: RepositoryFilter) => Promise<GithubRepository[]>;
  listAssets: (id: Required<RepositoryId>) => Promise<GithubAsset[]>;
  ping: () => Promise<void>;
}

export interface RepositoryId {
  owner?: string;
  name: string;
  ref?: string;
}

export interface RepositoryFilter {
  topics?: string[];
}
