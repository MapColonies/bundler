import { Statused } from '@bundler/common';
import { TaskKind } from './interfaces';

export enum BundlerStage {
  FAILURE,
  INIT,
  EXECUTION,
  ARCHIVE,
  CHECKSUM,
  DONE,
}

export interface TaskStatus extends Statused {
  name: string;
  kind: TaskKind;
}

export interface RepositoryStatus extends Statused {
  name: string;
  tasks: TaskStatus[];
}

export interface BundleStatus {
  repositories: RepositoryStatus[];
  tasksCompleted: number;
  tasksTotal: number;
  allTasksCompleted: boolean;
  output: string;
  stage: BundlerStage;
}
