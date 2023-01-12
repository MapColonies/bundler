import { mkdir, rm } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { nanoid } from 'nanoid';
import axios, { AxiosInstance } from 'axios';
import { RepositoryId, IGithubClient, GithubClient } from '@bundler/github';
import * as tar from 'tar';
import { writeBuffer } from '../fs';
import { Commander } from '../processes/commander';
import { DockerSaveArgs, Image } from '../processes/interfaces';
import { ILogger } from '../common/types';
import { BundlerOptions, BundlePath, Repository, RepositoryProfile, TaskKind } from './interfaces';
import {
  DEFAULT_BRANCH,
  DOCKER_FILE,
  TAR_FORMAT,
  MIGRATIONS_DOCKER_FILE,
  TAR_GZIP_ARCHIVE_FORMAT,
  DEFAULT_CONTAINER_REGISTRY,
  IMAGES_DIR,
  DEFAULT_OPTIONS,
  GITHUB_ORG,
  SOURCE_CODE_ARCHIVE,
  ASSETS_DIR,
  HTTP_CLIENT_TIMEOUT,
  HELM_DIR,
} from './constants';
import { BundleStatus, Status } from './status';

const stringifyRepositoryId = (id: RepositoryId): string => {
  return `${id.owner ?? GITHUB_ORG}-${id.name}-${id.ref ?? DEFAULT_BRANCH}`;
};

export class Bundler {
  private readonly logger: ILogger | undefined;
  private readonly githubClient: IGithubClient;
  private readonly axiosClient: AxiosInstance;
  private readonly commander: Commander;

  private bundleId: string = nanoid();
  private repositoryProfiles: RepositoryProfile[] = [];
  private tasksTotal = 0;
  private tasksCompleted = 0;

  // TODO generic docker worker and github interface
  // TODO: handle verbosity and logging including for commands
  public constructor(private readonly config: BundlerOptions = DEFAULT_OPTIONS) {
    this.logger = config.logger;
    this.githubClient = config.githubClient ?? new GithubClient();
    this.axiosClient = axios.create({ timeout: HTTP_CLIENT_TIMEOUT });
    this.commander = new Commander({ verbose: config.verbose, logger: this.logger });

    this.commander.on('buildCompleted', this.onBuildCompleted.bind(this));
    this.commander.on('pullCompleted', this.onPullCompleted.bind(this));
  }

  public get status(): BundleStatus {
    const repos = this.repositoryProfiles.map((repoProfile) => {
      const name = stringifyRepositoryId(repoProfile.id);
      const images = repoProfile.tasks
        .filter((task) => task.kind === DOCKER_FILE || task.kind === MIGRATIONS_DOCKER_FILE)
        .map((task) => ({ name: task.name, status: task.status, content: task.description }));

      const packages = repoProfile.tasks
        .filter((task) => task.kind === 'helm')
        .map((task) => ({ name: task.name, status: task.status, content: task.description }));

      const status = repoProfile.tasks.every((t) => t.status === Status.SUCCESS) ? Status.SUCCESS : Status.PENDING;
      return { name, images, packages, status };
    });

    return { repositories: repos, status: Status.PENDING };
  }

  private get allTasksCompleted(): boolean {
    return this.tasksCompleted === this.tasksTotal;
  }

  // TODO: bundle name as arg
  public async bundle(repositories: Repository[]): Promise<void> {
    this.reset();

    this.repositoryProfiles.push(...repositories.map((repo) => this.determineBaseRepositoryProfile(repo)));

    await this.download();
    await this.profileRepositories();
    const commands = this.constructCommands();

    if (this.allTasksCompleted) {
      return this.createOutput();
    }

    const promisifyTasksChain = new Promise((resolve, reject) => {
      this.commander.on('saveCompleted', async (image) => {
        await this.onSaveCompleted(image);
        if (this.allTasksCompleted) {
          resolve(await this.createOutput());
        }
      });

      this.commander.on('packageCompleted', async (packageId) => {
        await this.onPackageCompleted(packageId);
        if (this.allTasksCompleted) {
          resolve(await this.createOutput());
        }
      });

      this.commander.once('commandFailed', async (failedObj, error, message) => {
        await this.onCommandFailed(failedObj, error, message);
        reject(error);
      });
    });

    await Promise.all([...commands, promisifyTasksChain]);
  }

  private reset(): void {
    this.bundleId = nanoid();
    this.repositoryProfiles = [];
    this.tasksTotal = 0;
    this.tasksCompleted = 0;
  }

  private determineBaseRepositoryProfile(repository: Repository): RepositoryProfile {
    const repoWorkdir: BundlePath = {
      path: join(this.config.workdir, this.bundleId, stringifyRepositoryId(repository.id)),
      shouldMake: true,
      shouldRemove: false,
    };

    const repoArchivePath: BundlePath = {
      path: join(repoWorkdir.path, `${SOURCE_CODE_ARCHIVE}.${TAR_GZIP_ARCHIVE_FORMAT}`),
      shouldMake: false,
      shouldRemove: false,
    };

    const extractionDir: BundlePath = { path: join(repoWorkdir.path, nanoid()), shouldMake: true, shouldRemove: true };

    // TODO: remove
    let assetsDir: BundlePath | undefined = undefined;
    if (repository.includeAssets === true) {
      assetsDir = { path: join(repoWorkdir.path, ASSETS_DIR), shouldMake: true, shouldRemove: false };
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
    };
  }

  private async download(): Promise<void> {
    const archivePromises = this.repositoryProfiles.map(async (repo) => {
      const repoId = { ...repo.id, owner: repo.id.owner ?? GITHUB_ORG, ref: repo.id.ref ?? DEFAULT_BRANCH };

      const arrayBuffer = await this.githubClient.downloadRepository(repoId, 'tarball');

      await mkdir(repo.workdir.path, { recursive: true });

      await writeBuffer(arrayBuffer, repo.archive.path);
    });

    const assetsPromises = this.repositoryProfiles.map(async (repo) => {
      const repoId = { ...repo.id, owner: repo.id.owner ?? GITHUB_ORG, ref: repo.id.ref ?? DEFAULT_BRANCH };

      if (repo.includeAssets === true) {
        // TODO: dont throw if release not found
        const assets = await this.githubClient.listAssets(repoId);

        if (assets.length === 0) {
          return Promise.resolve();
        }

        await mkdir((repo.assets as BundlePath).path, { recursive: true });

        const singleRepoAssets = assets.map(async (asset) => {
          const { name, browser_download_url: downloadUrl } = asset;

          const buffer = await this.axiosClient.get<Buffer>(downloadUrl, { responseType: 'arraybuffer' });

          await writeBuffer(buffer.data, join((repo.assets as BundlePath).path, name));
        });

        await Promise.all(singleRepoAssets);
      }
    });

    await Promise.all([...archivePromises, ...assetsPromises]);
  }

  private async profileRepositories(): Promise<void> {
    for (const repo of this.repositoryProfiles) {
      const lookup: TaskKind[] = [DOCKER_FILE];

      if (repo.includeHelmPackage === true) {
        lookup.push(HELM_DIR);
      }

      if (repo.includeMigrations === true) {
        lookup.push(MIGRATIONS_DOCKER_FILE);
      }

      await tar.list({
        file: repo.archive.path,
        filter: (path) => (lookup as string[]).includes(basename(path)),
        onentry: (entry) => {
          const kind  = basename(entry.path) as TaskKind;
          const tag = repo.id.ref ?? 'latest';
          const name = kind === MIGRATIONS_DOCKER_FILE ? `${repo.id.name}-migrations` : repo.id.name;
          const description = repo.buildImageLocally === true ? '[building]' : '[pulling]';
          return repo.tasks.push({ id: nanoid(), name: `${name}:${tag}`, archivedPath: entry.path, kind, status: Status.PENDING, description });
        }
      });

      if (repo.tasks.length > 0) {
        this.tasksTotal += repo.tasks.length;

        await mkdir(repo.extraction.path, { recursive: true });

        await tar.extract({ file: repo.archive.path, cwd: repo.extraction.path });

        const kinds = repo.tasks.map((task) => task.kind);
        if (kinds.includes(DOCKER_FILE) || kinds.includes(MIGRATIONS_DOCKER_FILE)) {
          await mkdir(join(repo.workdir.path, IMAGES_DIR));
        }

        if (kinds.includes(HELM_DIR)) {
          await mkdir(join(repo.workdir.path, HELM_DIR));
        }
      }
    }
  }

  private constructCommands(): Promise<unknown>[] {
    const commands: Promise<unknown>[] = [];

    for (const repo of this.repositoryProfiles) {
      for (const external of repo.tasks) {
        if (external.kind === DOCKER_FILE || external.kind === MIGRATIONS_DOCKER_FILE) {
          const image = {
            id: external.id,
            name: external.kind === MIGRATIONS_DOCKER_FILE ? `${repo.id.name}-migrations` : repo.id.name,
            tag: repo.id.ref ?? 'latest',
          };

          if (repo.buildImageLocally === true) {
            const dockerBuildArgs = {
              dockerFile: join(repo.extraction.path, external.archivedPath),
              path: join(repo.extraction.path, dirname(external.archivedPath)),
              image,
            };

            commands.push(this.commander.build({ ...dockerBuildArgs, useBuildkit: true }));
          } else {
            const dockerPullArgs = {
              image,
              registry: DEFAULT_CONTAINER_REGISTRY,
            };

            commands.push(this.commander.pull(dockerPullArgs));
          }
        } else {
          commands.push(
            this.commander.package({
              packageId: external.id,
              path: join(repo.extraction.path, external.archivedPath),
              destination: join(repo.workdir.path, HELM_DIR),
            })
          );
        }
      }
    }

    return commands;
  }

  // TODO: pre bundle cleanup should run when all external tasks of a repo are done
  private async preBundleCleanup(repos?: RepositoryProfile[]): Promise<void> {
    const removable: BundlePath[] = [];

    const reposToClean = repos ?? this.repositoryProfiles;

    for (const repo of reposToClean) {
      const paths = [repo.workdir, repo.extraction, repo.archive];
      removable.push(...paths.filter((path) => path.shouldRemove));
    }

    await Promise.allSettled(removable.map(async (path) => rm(path.path, { recursive: true })));
  }

  private async postBundleCleanup(): Promise<void> {
    const bundleDir = join(this.config.workdir, this.bundleId);
    await rm(bundleDir, { recursive: true });
  }

  private async createBundle(): Promise<void> {
    this.logger?.info({ msg: 'creating bundle' });

    const bundleDir = join(this.config.workdir, this.bundleId);
    await tar.create({ cwd: bundleDir, file: this.config.outputPath, gzip: true }, ['.']);
  }

  private async onBuildCompleted(image: Image): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'buildCompleted', image });

    const repo = this.taskIdToRepositoryLookup(image.id);
    const index = repo.tasks.findIndex((task) => task.id === image.id);
    if (index !== -1) {
      repo.tasks[index] = { ...repo.tasks[index], description: '[saving]' };
    }


    await this.commander.save({ image, path: join(repo.workdir.path, IMAGES_DIR, `${image.name}-${image.tag}.${TAR_FORMAT}`) });
  }

  private async onPullCompleted(image: Image): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'pullCompleted', image });

    const repo = this.taskIdToRepositoryLookup(image.id);
    const index = repo.tasks.findIndex((task) => task.id === image.id);
    if (index !== -1) {
      repo.tasks[index] = { ...repo.tasks[index], description: '[saving]' };
    }


    const args: DockerSaveArgs = { image, path: join(repo.workdir.path, IMAGES_DIR, `${image.name}-${image.tag}.${TAR_FORMAT}`) };

    if (repo.buildImageLocally === false) {
      args.registry = DEFAULT_CONTAINER_REGISTRY;
    }

    await this.commander.save(args);
  }

  // TODO: add object for identification
  private async onPackageCompleted(packageId: string): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'packageCompleted', packageId });

    const repo = this.taskIdToRepositoryLookup(packageId);
    const index = repo.tasks.findIndex((task) => task.id === packageId);
    if (index !== -1) {
      repo.tasks[index] = { ...repo.tasks[index], status: Status.SUCCESS, description: '[done]' };
    }
    repo.completed++;

    if (this.config.cleanupMode === 'on-the-fly' && repo.completed === repo.tasks.length) {
      await this.preBundleCleanup([repo]);
    }

    this.tasksCompleted++;
  }

  private async onSaveCompleted(image: Image): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'saveCompleted', image });

    const repo = this.taskIdToRepositoryLookup(image.id);
    const index = repo.tasks.findIndex((task) => task.id === image.id);
    if (index !== -1) {
      repo.tasks[index] = { ...repo.tasks[index], status: Status.SUCCESS, description: '[done]' };
    }

    repo.completed++;

    if (this.config.cleanupMode === 'on-the-fly' && repo.completed === repo.tasks.length) {
      await this.preBundleCleanup([repo]);
    }

    this.tasksCompleted++;
  }

  private async onCommandFailed(failedObj: unknown, error: unknown, message?: string): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'commandFailed', failedObj, error, message });

    this.commander.terminate();
    await this.postBundleCleanup();
    throw error;
  }

  private taskIdToRepositoryLookup(taskId: string): RepositoryProfile {
    return this.repositoryProfiles.find((repo) => repo.tasks.find((external) => external.id === taskId)) as RepositoryProfile;
  }

  private async createOutput(): Promise<void> {
    if (this.config.cleanupMode === 'post') {
      await this.preBundleCleanup();
    }

    await this.createBundle();

    if (this.config.cleanupMode !== 'none') {
      await this.postBundleCleanup();
    }
  }
}
