import { hostname } from 'os';
import { mkdir, rm, writeFile } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { NOT_FOUND_INDEX, Status } from '@bundler/common';
import { nanoid } from 'nanoid';
import { RepositoryId, IGithubClient, GithubClient } from '@bundler/github';
import * as tar from 'tar';
import { TypedEmitter } from 'tiny-typed-emitter';
import { dump } from 'js-yaml';
import { writeBuffer } from '../fs';
import { Commander } from '../processes/commander';
import { DockerSaveArgs, Image } from '../processes/interfaces';
import { ILogger } from '../common/types';
import { BundlerOptions, BundlePath, Repository, RepositoryProfile, TaskKind, RepositoryTask, TaskStage } from './interfaces';
import {
  DEFAULT_BRANCH,
  DOCKER_FILE,
  TAR_FORMAT,
  MIGRATIONS_DOCKER_FILE,
  TAR_GZIP_ARCHIVE_FORMAT,
  DEFAULT_CONTAINER_REGISTRY,
  DEFAULT_OPTIONS,
  GITHUB_ORG,
  SOURCE_CODE_ARCHIVE,
  HELM_DIR,
  MANIFEST_FILE,
  BundleDirs,
  TGZ_ARCHIVE_FORMAT,
  CHECKSUM_FILE,
} from './constants';
import { BundleStatus, BundlerStage } from './status';
import { BundleOutputTree, Manifest } from './manifest';
import { ChecksumOutput, createChecksum } from './checksum/checksum';

const stringifyRepositoryId = (id: RepositoryId): string => {
  return `${id.owner ?? GITHUB_ORG}-${id.name}-${id.ref ?? DEFAULT_BRANCH}`;
};

interface BundlerEvents {
  statusUpdated: (status: BundleStatus) => void;
}

export class Bundler extends TypedEmitter<BundlerEvents> {
  private readonly logger: ILogger | undefined;
  private readonly githubClient: IGithubClient;
  private readonly commander: Commander;

  private readonly bundleId: string = nanoid();
  private readonly repositoryProfiles: RepositoryProfile[] = [];
  private tasksTotal = 0;
  private tasksCompleted = 0;
  private stage: BundlerStage = BundlerStage.INIT;
  private statusCache: BundleStatus | undefined;
  private eventOccurred = false;

  // TODO generic docker worker and github interface
  // TODO: handle verbosity and logging including for commands
  public constructor(private readonly config: BundlerOptions = DEFAULT_OPTIONS) {
    super();
    this.logger = config.logger;
    this.githubClient = config.githubClient ?? new GithubClient();
    this.commander = new Commander({ verbose: config.isDebugMode, logger: this.logger });

    this.commander.on('buildCompleted', this.onBuildCompleted.bind(this));
    this.commander.on('pullCompleted', this.onPullCompleted.bind(this));

    this.logger?.debug({ msg: 'bundler initialized', config });
  }

  public get status(): BundleStatus {
    if (!this.eventOccurred && this.statusCache !== undefined) {
      return this.statusCache;
    }

    const repos = this.repositoryProfiles.map((repoProfile) => {
      const name = stringifyRepositoryId(repoProfile.id);
      const tasks = repoProfile.tasks.map((task) => ({ name: task.name, status: task.status, kind: task.kind, content: task.stage }));
      const repoStatus = repoProfile.profiled && repoProfile.tasks.every((t) => t.status === Status.SUCCESS) ? Status.SUCCESS : Status.PENDING;
      return { name, tasks, status: repoStatus };
    });

    this.statusCache = {
      repositories: repos,
      allTasksCompleted: this.allTasksCompleted,
      output: this.config.outputPath,
      stage: this.stage,
      tasksCompleted: this.tasksCompleted,
      tasksTotal: this.tasksTotal,
    };
    this.eventOccurred = false;

    return this.statusCache;
  }

  private get allTasksCompleted(): boolean {
    return this.tasksCompleted === this.tasksTotal && this.repositoryProfiles.every((p) => p.profiled);
  }

  public async bundle(repositories: Repository[]): Promise<void> {
    this.repositoryProfiles.push(...repositories.map((repo) => this.determineBaseRepositoryProfile(repo)));

    await this.download();
    await this.profileRepositories();
    const commands = this.constructCommands();

    if (this.allTasksCompleted) {
      return this.createOutputs();
    }

    this.emitStatusUpdated(BundlerStage.EXECUTION);

    const promisifyTasksChain = new Promise((resolve, reject) => {
      this.commander.on('saveCompleted', async (image) => {
        await this.onSaveCompleted(image);
        if (this.allTasksCompleted) {
          resolve(await this.createOutputs());
        }
      });

      this.commander.on('packageCompleted', async (helmPackage) => {
        await this.onPackageCompleted(helmPackage.id);
        if (this.allTasksCompleted) {
          resolve(await this.createOutputs());
        }
      });

      this.commander.on('downloadCompleted', async (download) => {
        this.onDownloadCompleted(download.id);
        if (this.allTasksCompleted) {
          resolve(await this.createOutputs());
        }
      });

      this.commander.once('commandFailed', async (failedObj, error, message) => {
        await this.onCommandFailed(failedObj, error, message);
        reject(error);
      });
    });

    await Promise.all([...commands, promisifyTasksChain]);
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
      assetsDir = { path: join(repoWorkdir.path, BundleDirs.ASSETS), shouldMake: true, shouldRemove: false };
    }

    this.emitStatusUpdated();

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

  private async download(): Promise<void> {
    const archivePromises = this.repositoryProfiles.map(async (repo) => {
      const repoId = { ...repo.id, owner: repo.id.owner ?? GITHUB_ORG, ref: repo.id.ref ?? DEFAULT_BRANCH };

      const arrayBuffer = await this.githubClient.downloadRepository(repoId, 'tarball');

      await mkdir(repo.workdir.path, { recursive: true });

      await writeBuffer(arrayBuffer, repo.archive.path);
    });

    await Promise.all(archivePromises);
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

      if (repo.includeAssets === true) {
        const repoId = { ...repo.id, owner: repo.id.owner ?? GITHUB_ORG, ref: repo.id.ref ?? DEFAULT_BRANCH };
        const assets = await this.githubClient.listAssets(repoId);
        if (assets.length > 0) {
          await mkdir((repo.assets as BundlePath).path, { recursive: true });
          assets.map((asset) => {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { name, browser_download_url } = asset;
            return repo.tasks.push({
              id: nanoid(),
              archivedPath: browser_download_url,
              name,
              kind: 'asset',
              status: Status.PENDING,
              stage: TaskStage.DOWNLOADING,
            });
          });
        }
      }

      await tar.list({
        file: repo.archive.path,
        filter: (path) => (lookup as string[]).includes(basename(path)),
        onentry: (entry) => {
          const kind = basename(entry.path) as TaskKind;
          const tag = repo.id.ref ?? 'latest';
          const name = kind === MIGRATIONS_DOCKER_FILE ? `${repo.id.name}-migrations` : repo.id.name;
          const stage = repo.buildImageLocally === true ? TaskStage.BUILDING : TaskStage.PULLING;
          return repo.tasks.push({ id: nanoid(), name: `${name}:${tag}`, archivedPath: entry.path, kind, status: Status.PENDING, stage });
        },
      });

      if (repo.tasks.length > 0) {
        this.tasksTotal += repo.tasks.length;

        await mkdir(repo.extraction.path, { recursive: true });

        await tar.extract({ file: repo.archive.path, cwd: repo.extraction.path });

        const kinds = repo.tasks.map((task) => task.kind);
        if (kinds.includes(DOCKER_FILE) || kinds.includes(MIGRATIONS_DOCKER_FILE)) {
          await mkdir(join(repo.workdir.path, BundleDirs.IMAGES));
        }

        if (kinds.includes(HELM_DIR)) {
          await mkdir(join(repo.workdir.path, BundleDirs.HELM_PACKGES));
        }
      }

      repo.profiled = true;
      this.emitStatusUpdated();
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
        } else if (external.kind === 'helm') {
          commands.push(
            this.commander.package({
              packageId: external.id,
              path: join(repo.extraction.path, external.archivedPath),
              destination: join(repo.workdir.path, HELM_DIR),
            })
          );
        } else {
          commands.push(
            this.commander.download({
              id: external.id,
              url: external.archivedPath,
              destination: join((repo.assets as BundlePath).path, external.name),
            })
          );
        }
      }
    }

    return commands;
  }

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
    await mkdir(dirname(this.config.outputPath), { recursive: true });
    await tar.create({ cwd: bundleDir, file: this.config.outputPath, gzip: true }, ['.']);
  }

  private async onBuildCompleted(image: Image): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'buildCompleted', image });

    const repo = this.taskIdToRepositoryLookup(image.id);
    this.patchTask(repo, { id: image.id, stage: TaskStage.SAVING });

    this.emitStatusUpdated();

    await this.commander.save({ image, path: join(repo.workdir.path, BundleDirs.IMAGES, `${image.name}-${image.tag}.${TAR_FORMAT}`) });
  }

  private async onPullCompleted(image: Image): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'pullCompleted', image });

    const repo = this.taskIdToRepositoryLookup(image.id);
    this.patchTask(repo, { id: image.id, stage: TaskStage.SAVING });

    this.emitStatusUpdated();

    const args: DockerSaveArgs = {
      image,
      registry: DEFAULT_CONTAINER_REGISTRY,
      path: join(repo.workdir.path, BundleDirs.IMAGES, `${image.name}-${image.tag}.${TAR_FORMAT}`),
    };

    if (repo.buildImageLocally === false) {
      args.registry = DEFAULT_CONTAINER_REGISTRY;
    }

    await this.commander.save(args);
  }

  // TODO: add object for identification
  private async onPackageCompleted(packageId: string): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'packageCompleted', packageId });

    const repo = this.taskIdToRepositoryLookup(packageId);
    this.patchTask(repo, { id: packageId, status: Status.SUCCESS, stage: undefined });
    repo.completed++;

    if (this.config.cleanupMode === 'on-the-fly' && repo.completed === repo.tasks.length) {
      await this.preBundleCleanup([repo]);
    }

    this.tasksCompleted++;
    this.emitStatusUpdated();
  }

  private onDownloadCompleted(downloadId: string): void {
    this.logger?.info({ bundleId: this.bundleId, msg: 'downloadCompleted', downloadId });

    const repo = this.taskIdToRepositoryLookup(downloadId);
    this.patchTask(repo, { id: downloadId, status: Status.SUCCESS, stage: undefined });
    repo.completed++;
    this.tasksCompleted++;

    this.emitStatusUpdated();
  }

  private async onSaveCompleted(image: Image): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'saveCompleted', image });

    const repo = this.taskIdToRepositoryLookup(image.id);
    this.patchTask(repo, { id: image.id, status: Status.SUCCESS, stage: undefined });
    repo.completed++;

    if (this.config.cleanupMode === 'on-the-fly' && repo.completed === repo.tasks.length) {
      await this.preBundleCleanup([repo]);
    }

    this.tasksCompleted++;
    this.emitStatusUpdated();
  }

  private async onCommandFailed(failedObj: { id: string }, error: unknown, message?: string): Promise<void> {
    const repository = this.taskIdToRepositoryLookup(failedObj.id);
    const task = repository.tasks.find((task) => task.id === failedObj.id);

    this.logger?.error({ bundleId: this.bundleId, msg: 'commandFailed', failedObj, repository, task, err: error, message });

    this.commander.terminate();
    if (this.config.cleanupMode !== 'none') {
      await this.postBundleCleanup();
    }

    this.emitStatusUpdated(BundlerStage.FAILURE);
  }

  private taskIdToRepositoryLookup(taskId: string): RepositoryProfile {
    return this.repositoryProfiles.find((repo) => repo.tasks.find((external) => external.id === taskId)) as RepositoryProfile;
  }

  private patchTask(repo: RepositoryProfile, updatedTask: Partial<RepositoryTask>): void {
    const index = repo.tasks.findIndex((task) => task.id === updatedTask.id);
    if (index !== NOT_FOUND_INDEX) {
      repo.tasks[index] = { ...repo.tasks[index], ...updatedTask };
    }
  }

  private async createOutputs(): Promise<void> {
    this.emitStatusUpdated(BundlerStage.ARCHIVE);

    if (this.config.cleanupMode === 'post') {
      await this.preBundleCleanup();
    }

    const manifest = this.createManifest();
    await writeFile(join(this.config.workdir, this.bundleId, MANIFEST_FILE), dump(manifest));

    await this.createBundle();

    this.emitStatusUpdated(BundlerStage.CHECKSUM);

    const checksum = await createChecksum(this.config.outputPath);
    const checksumOutput: ChecksumOutput = {
      id: manifest.id,
      hostname: manifest.hostname,
      createdAt: manifest.createdAt,
      destination: `${this.config.outputPath}-${CHECKSUM_FILE}`,
      checksum,
    };
    await writeFile(checksumOutput.destination, dump(checksumOutput));

    if (this.config.cleanupMode !== 'none') {
      await this.postBundleCleanup();
    }

    this.emitStatusUpdated(BundlerStage.DONE);
  }

  private createManifest(): Manifest {
    const outputTree: BundleOutputTree = {};

    const repositoryParams = this.repositoryProfiles.map((repo) => {
      const images: string[] = [];
      const assets: string[] = [];
      const helm: string[] = [];

      repo.tasks.forEach((task) => {
        if (task.kind === 'Dockerfile' || task.kind === 'migrations.Dockerfile') {
          images.push(`${task.name}.${TAR_FORMAT}`);
        } else if (task.kind === 'asset') {
          assets.push(task.name);
        } else {
          helm.push(`${task.name}.${TGZ_ARCHIVE_FORMAT}`);
        }
      });

      const repoOutput = [`${SOURCE_CODE_ARCHIVE}.${TAR_GZIP_ARCHIVE_FORMAT}`, { images: images }, { assets: assets }, { helm: helm }];

      const id = stringifyRepositoryId(repo.id);
      outputTree[id] = repoOutput;

      return {
        id,
        buildImageLocally: repo.buildImageLocally,
        includeMigrations: repo.includeMigrations,
        includeAssets: repo.includeAssets,
        includeHelmPackage: repo.includeHelmPackage,
      };
    });

    return {
      id: this.bundleId,
      hostname: hostname(),
      createdAt: new Date().toISOString(),
      destination: this.config.outputPath,
      output: outputTree,
      parameters: {
        repositories: repositoryParams,
      },
    };
  }

  private emitStatusUpdated(stage?: BundlerStage): void {
    this.stage = stage ?? this.stage;
    this.eventOccurred = true;
    this.emit('statusUpdated', this.status);
    this.logger?.debug({ msg: 'status updated', status: this.status });
  }
}
