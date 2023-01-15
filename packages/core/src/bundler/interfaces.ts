import { IGithubClient, RepositoryId } from '@bundler/github';
import { ILogger } from '../common/types';
import { Status } from './status';

export interface BaseOutput {
  id: string;
  hostname: string;
  destination: string;
  createdAt: string;
}

export interface RepositoryTask {
  id: string;
  kind: TaskKind;
  archivedPath: string;
  status: Status;
  name: string;
  stage?: TaskStage;
}

export enum TaskStage {
  BUILDING = 'building',
  PULLING = 'pulling',
  SAVING = 'saving',
  DOWNLOADING = 'downloading',
}

export type TaskKind = 'Dockerfile' | 'migrations.Dockerfile' | 'helm' | 'asset';

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
  profiled: boolean;
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
