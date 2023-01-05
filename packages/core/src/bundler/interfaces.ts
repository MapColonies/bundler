import { IGithubClient, RepositoryId } from '@bundler/github';
import { ILogger } from '../common/types';
import { DockerKind } from '../processes/types';

export interface Repository {
  id: RepositoryId;
  buildImageLocally?: boolean;
  includeMigrations?: boolean;
  includeAssets?: boolean;
}

export interface RepositoryProfile extends Repository {
  workdir: BundlePath;
  archive: BundlePath;
  extraction: BundlePath;
  assets?: BundlePath;
  dockerfiles: { id: string; archivedPath: string; kind?: DockerKind }[];
}

export interface BundlePath {
  path: string;
  shouldMake: boolean;
  shouldRemove: boolean;
}

export type CleanupMode = 'none' | 'on-the-fly' | 'post';

export interface BundlerOptions {
  workdir: string;
  outputPath: string;
  githubClient?: IGithubClient;
  isDebugMode?: boolean;
  cleanupMode?: CleanupMode;
  verbose?: boolean;
  logger?: ILogger;
}
