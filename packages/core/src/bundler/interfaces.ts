import { IGithubClient, RepositoryId } from '@bundler/github';
import { ILogger } from '../common/types';
import { Status } from './status';

export interface RepositoryTask {
  id: string;
  kind: TaskKind;
  archivedPath: string;
  status: Status;
  name: string;
  description?: string;
}

export type TaskKind = 'Dockerfile' | 'migrations.Dockerfile' | 'helm';

export interface Repository {
  id: RepositoryId;
  buildImageLocally?: boolean;
  includeMigrations?: boolean;
  includeAssets?: boolean;
  includeHelmPackage?: boolean;
}

export interface RepositoryProfile extends Repository {
  workdir: BundlePath;
  archive: BundlePath;
  extraction: BundlePath;
  assets?: BundlePath;
  tasks: RepositoryTask[];
  completed: number;
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
