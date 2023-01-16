import { Statused } from '@bundler/common/src';
import { TaskKind } from './interfaces';

export interface TaskStatus extends Statused {
  name: string;
  kind: TaskKind;
}

export interface RepositoryStatus extends Statused {
  name: string;
  tasks: TaskStatus[];
}

export interface BundleStatus extends Statused {
  repositories: RepositoryStatus[];
  tasksCompleted: number;
  tasksTotal: number;
  allTasksCompleted: boolean;
  output: string;
}
