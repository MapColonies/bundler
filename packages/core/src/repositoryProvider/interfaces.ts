import { RepositoryId } from '@bundler/github';
import { Repository, RepositoryProfile, RepositoryTask } from '../bundler/interfaces';

export interface IRepositoryProvider {
  addRepository: (repositoryProfile: Repository, workdir: string, bundleId: string) => void;
  addTask: (repositoryId: RepositoryId, task: RepositoryTask) => void;
  getRepositories: () => Readonly<RepositoryProfile>[];
  getRepositoryById: (repositoryId: RepositoryId) => Readonly<RepositoryProfile> | null;
  getRepositoryByTaskId: (taskId: string) => Readonly<RepositoryProfile> | null;
  patchRepository: (repoId: RepositoryId, updatedRepository: Partial<RepositoryProfile>) => void;
  patchTask: (taskId: string, updatedTask: Partial<RepositoryTask>) => void;
}
