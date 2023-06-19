import { IParentLogger, Status } from '@map-colonies/bundler-common';
import { Repository } from '@map-colonies/bundler-common';
import { IGithubClient } from '@map-colonies/bundler-github';
import { IRepositoryProvider } from '../repositoryProvider/interfaces';
import { ChecksumOutput } from './checksum/checksum';
import { TaskStage } from './enums';
import { Manifest } from './manifest/manifest';
import { BundleStatus } from './status';

export interface BundlerEvents {
  statusUpdated: (status: BundleStatus) => void;
  manifestCreated: (manifest: Manifest) => Promise<void> | void;
  checksumCreated: (checksum: ChecksumOutput) => Promise<void> | void;
}

export type DefaultBundlerOptions = Required<Omit<BundlerOptions, 'logger'>>;

export interface RepositoryTask {
  id: string;
  kind: TaskKind;
  archivedPath: string;
  status: Status;
  name: string;
  stage?: TaskStage;
}

export type TaskKind = 'Dockerfile' | 'migrations.Dockerfile' | 'helm' | 'asset';

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
  logger?: IParentLogger;
  provider?: IRepositoryProvider;
}

export interface BaseOutput {
  id: string;
  hostname: string;
  destination: string;
  createdAt: string;
}
