import { join } from 'path';
import { nanoid } from 'nanoid';
import { RepositoryId } from '@bundler/github';
import { NOT_FOUND_INDEX } from '@bundler/common';
import { SOURCE_CODE_ARCHIVE, TAR_GZIP_ARCHIVE_FORMAT } from '../bundler/constants';
import { BundlePath, Repository, RepositoryProfile, RepositoryTask } from '../bundler/interfaces';
import { stringifyRepositoryId } from '../common/util';
import { BundleDirs } from '../bundler/enums';
import { IRepositoryProvider } from './interfaces';

export class RepositoryProvider implements IRepositoryProvider {
  private readonly repositoryProfiles: RepositoryProfile[] = [];

  public addRepository(repository: Repository, workdir: string, bundleId: string): void {
    const exists = this.getRepositoryIndex(repository.id);
    if (exists !== NOT_FOUND_INDEX) {
      throw new Error(`repository ${stringifyRepositoryId(repository.id)} already exists on provider`);
    }

    this.repositoryProfiles.push(this.determineBaseRepositoryProfile(repository, workdir, bundleId));
  }

  public addTask(repositoryId: RepositoryId, task: RepositoryTask): void {
    const exists = this.getRepositoryByTaskId(task.id);
    if (exists !== null) {
      throw new Error(`task ${task.id} already exists`);
    }

    const repoIndex = this.getRepositoryIndex(repositoryId);
    if (repoIndex === NOT_FOUND_INDEX) {
      return;
    }

    this.repositoryProfiles[repoIndex].tasks.push(task);
  }

  public getRepositoryById(repositoryId: RepositoryId): Readonly<RepositoryProfile> | null {
    const repositoryIndex = this.getRepositoryIndex(repositoryId);
    return repositoryIndex !== NOT_FOUND_INDEX ? this.repositoryProfiles[repositoryIndex] : null;
  }

  public getRepositories(): Readonly<RepositoryProfile>[] {
    return this.repositoryProfiles;
  }

  public getRepositoryByTaskId(taskId: string): Readonly<RepositoryProfile> | null {
    const repository = this.repositoryProfiles.find((repo) => repo.tasks.find((external) => external.id === taskId));
    return repository ?? null;
  }

  public patchRepository(repoId: RepositoryId, updatedRepository: Partial<RepositoryProfile>): void {
    const repoIndex = this.getRepositoryIndex(repoId);
    if (repoIndex === NOT_FOUND_INDEX) {
      return;
    }

    this.repositoryProfiles[repoIndex] = { ...this.repositoryProfiles[repoIndex], ...updatedRepository };
  }

  public patchTask(taskId: string, updatedTask: Partial<RepositoryTask>): void {
    const repository = this.getRepositoryByTaskId(taskId);
    if (repository === null) {
      throw new Error(`task ${taskId} not found`);
    }

    const repoIndex = this.getRepositoryIndex(repository.id);
    if (repoIndex === NOT_FOUND_INDEX) {
      return;
    }

    const taskIndex = this.repositoryProfiles[repoIndex].tasks.findIndex((task) => task.id === taskId);
    if (taskIndex !== NOT_FOUND_INDEX) {
      this.repositoryProfiles[repoIndex].tasks[taskIndex] = { ...this.repositoryProfiles[repoIndex].tasks[taskIndex], ...updatedTask };
    }
  }

  private getRepositoryIndex(repositoryId: RepositoryId): number {
    return this.repositoryProfiles.findIndex((repo) => stringifyRepositoryId(repo.id) === stringifyRepositoryId(repositoryId));
  }

  private determineBaseRepositoryProfile(repository: Repository, workdir: string, bundleId: string): RepositoryProfile {
    const repoWorkdir: BundlePath = {
      path: join(workdir, bundleId, stringifyRepositoryId(repository.id)),
      shouldMake: true,
      shouldRemove: false,
    };

    const repoArchivePath: BundlePath = {
      path: join(repoWorkdir.path, `${SOURCE_CODE_ARCHIVE}.${TAR_GZIP_ARCHIVE_FORMAT}`),
      shouldMake: false,
      shouldRemove: false,
    };

    const extractionDir: BundlePath = { path: join(repoWorkdir.path, nanoid()), shouldMake: true, shouldRemove: true };

    let assetsDir: BundlePath | undefined = undefined;
    if (repository.includeAssets === true) {
      assetsDir = { path: join(repoWorkdir.path, BundleDirs.ASSETS), shouldMake: true, shouldRemove: false };
    }

    return {
      ...repository,
      id: { ...repository.id, name: repository.id.name.toLowerCase() },
      workdir: repoWorkdir,
      archive: repoArchivePath,
      extraction: extractionDir,
      assets: assetsDir,
      tasks: [],
      completed: 0,
      profiled: false,
    };
  }
}
