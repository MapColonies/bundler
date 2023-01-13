import { TaskKind } from './interfaces';

// TODO: common
interface Statused {
  status: Status;
  content?: string;
}

// TODO: common
export enum Status {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILURE = 'FAILURE',
}

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
