import { hostname } from 'os';
import { mkdir, rm, writeFile } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { GITHUB_ORG, ILogger, Status } from '@map-colonies/bundler-common';
import { DockerBuildArgs, DockerPullArgs, DockerSaveArgs, HelmPackage, Image, TerminationResult } from '@map-colonies/bundler-child-process';
import { nanoid } from 'nanoid';
import { IGithubClient } from '@map-colonies/bundler-github';
import * as tar from 'tar';
import { TypedEmitter } from 'tiny-typed-emitter';
import { dump } from 'js-yaml';
import { TaskCommander } from '../taskCommander/taskCommander';
import { IRepositoryProvider } from '../repositoryProvider/interfaces';
import { provideDefaultOptions, stringifyRepositoryId, writeBuffer } from '../common/util';
import { DownloadObject } from '../http/download';
import { BundlerOptions, BundlePath, Repository, RepositoryProfile, TaskKind, BundlerEvents, BaseOutput, RepositoryTask } from './interfaces';
import {
  DEFAULT_BRANCH,
  DOCKER_FILE,
  TAR_FORMAT,
  MIGRATIONS_DOCKER_FILE,
  DEFAULT_CONTAINER_REGISTRY,
  HELM_DIR,
  MANIFEST_FILE,
  CHECKSUM_FILE,
} from './constants';
import { BundleStatus, BundlerStage } from './status';
import { Manifest, manifestRepositories } from './manifest/manifest';
import { ChecksumOutput, checksumFile } from './checksum/checksum';
import { BundleDirs, TaskStage } from './enums';

export class Bundler extends TypedEmitter<BundlerEvents> {
  private readonly logger: ILogger | undefined;
  private readonly githubClient: IGithubClient;
  private readonly taskCommander: TaskCommander;
  private readonly provider: IRepositoryProvider;

  private readonly bundleId: string = nanoid();
  private tasksTotal = 0;
  private tasksCompleted = 0;
  private stage: BundlerStage = BundlerStage.INIT;
  private statusCache: BundleStatus | undefined;
  private eventOccurred = false;

  public constructor(private readonly config: BundlerOptions) {
    super();
    const defaultOptions = provideDefaultOptions();
    const baseLogger = config.logger?.child({ bundleId: this.bundleId });
    this.logger = config.logger?.child({ bundleId: this.bundleId });
    this.taskCommander = new TaskCommander({ verbose: config.isDebugMode, logger: baseLogger });
    this.githubClient = config.githubClient ?? defaultOptions.githubClient;
    this.provider = config.provider ?? defaultOptions.provider;

    this.taskCommander.on('buildCompleted', this.onBuildCompleted.bind(this));
    this.taskCommander.on('pullCompleted', this.onPullCompleted.bind(this));
    this.taskCommander.on('terminateCompleted', this.onTerminateCompleted.bind(this));

    this.logger?.debug({ msg: 'bundler initialized', config });
  }

  public get status(): BundleStatus {
    if (!this.eventOccurred && this.statusCache !== undefined) {
      return this.statusCache;
    }

    const repos = this.provider.getRepositories().map((repoProfile) => {
      const name = stringifyRepositoryId(repoProfile.id);
      const tasks = repoProfile.tasks.map((task) => ({ id: task.id, name: task.name, status: task.status, kind: task.kind, content: task.stage }));
      const repoStatus = repoProfile.profiled && repoProfile.tasks.every((t) => t.status === Status.SUCCESS) ? Status.SUCCESS : Status.PENDING;
      return { id: repoProfile.id, name, tasks, status: repoStatus };
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
    return this.tasksCompleted === this.tasksTotal && this.provider.getRepositories().every((p) => p.profiled);
  }

  public async bundle(repositories: Repository[]): Promise<void> {
    for (const repo of repositories) {
      this.provider.addRepository(repo, this.config.workdir, this.bundleId);
      this.emitStatusUpdated();
    }

    await this.download();
    await this.profileRepositories();
    const commands = this.constructCommands();

    if (this.allTasksCompleted) {
      return this.createOutputs();
    }

    this.emitStatusUpdated(BundlerStage.EXECUTION);

    const promisifyTasksChain = new Promise((resolve, reject) => {
      this.taskCommander.on('saveCompleted', async (image) => {
        await this.onSaveCompleted(image);
        if (this.allTasksCompleted) {
          resolve(await this.createOutputs());
        }
      });

      this.taskCommander.on('packageCompleted', async (helmPackage) => {
        await this.onPackageCompleted(helmPackage);
        if (this.allTasksCompleted) {
          resolve(await this.createOutputs());
        }
      });

      this.taskCommander.on('downloadCompleted', async (download) => {
        this.onDownloadCompleted(download);
        if (this.allTasksCompleted) {
          resolve(await this.createOutputs());
        }
      });

      this.taskCommander.once('commandFailed', async (failedObj, error, message) => {
        await this.onCommandFailed(failedObj, error, message);
        reject(error);
      });
    });

    await Promise.all([...commands, promisifyTasksChain]);
  }

  private async download(): Promise<void> {
    const downloadRepositoryPromises = this.provider.getRepositories().map(async (repo) => {
      const repoId = { ...repo.id, owner: repo.id.owner ?? GITHUB_ORG, ref: repo.id.ref ?? DEFAULT_BRANCH };

      const arrayBuffer = await this.githubClient.downloadRepository(repoId, 'tarball');
      await mkdir(repo.workdir.path, { recursive: true });
      await writeBuffer(arrayBuffer, repo.archive.path);
    });

    await Promise.all(downloadRepositoryPromises);
  }

  private async profileRepositories(): Promise<void> {
    for (const repo of this.provider.getRepositories()) {
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
          for (const asset of assets) {
            const task: RepositoryTask = {
              id: nanoid(),
              archivedPath: asset.browser_download_url,
              name: asset.name,
              kind: 'asset',
              status: Status.PENDING,
              stage: TaskStage.DOWNLOADING,
            };
            this.provider.addTask(repo.id, task);
          }
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
          const task: RepositoryTask = { id: nanoid(), name: `${name}:${tag}`, archivedPath: entry.path, kind, status: Status.PENDING, stage };
          this.provider.addTask(repo.id, task);
        },
      });

      const profiledRepo = this.provider.getRepositoryById(repo.id) as Readonly<RepositoryProfile>;
      if (profiledRepo.tasks.length > 0) {
        this.tasksTotal += profiledRepo.tasks.length;

        await mkdir(profiledRepo.extraction.path, { recursive: true });

        await tar.extract({ file: profiledRepo.archive.path, cwd: repo.extraction.path });

        const kinds = profiledRepo.tasks.map((task) => task.kind);
        if (kinds.includes(DOCKER_FILE) || kinds.includes(MIGRATIONS_DOCKER_FILE)) {
          await mkdir(join(profiledRepo.workdir.path, BundleDirs.IMAGES));
        }

        if (kinds.includes(HELM_DIR)) {
          await mkdir(join(profiledRepo.workdir.path, BundleDirs.HELM_PACKGES));
        }
      }

      this.provider.patchRepository(profiledRepo.id, { profiled: true });
      this.emitStatusUpdated();
    }
  }

  private constructCommands(): Promise<unknown>[] {
    const commands: Promise<unknown>[] = [];

    for (const repo of this.provider.getRepositories()) {
      for (const task of repo.tasks) {
        if (task.kind === DOCKER_FILE || task.kind === MIGRATIONS_DOCKER_FILE) {
          const image = {
            id: task.id,
            name: task.kind === MIGRATIONS_DOCKER_FILE ? `${repo.id.name}-migrations` : repo.id.name,
            tag: repo.id.ref ?? 'latest',
          };

          if (repo.buildImageLocally === true) {
            const dockerBuildArgs: DockerBuildArgs = {
              dockerFile: join(repo.extraction.path, task.archivedPath),
              path: join(repo.extraction.path, dirname(task.archivedPath)),
              image,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              envOptions: { DOCKER_BUILDKIT: '1' },
              buildArgs: repo.buildArgs,
            };

            commands.push(this.taskCommander.build(dockerBuildArgs));
          } else {
            const dockerPullArgs: DockerPullArgs = {
              image,
              registry: DEFAULT_CONTAINER_REGISTRY,
            };

            commands.push(this.taskCommander.pull(dockerPullArgs));
          }
        } else if (task.kind === 'helm') {
          commands.push(
            this.taskCommander.package({
              helmPackage: { id: task.id },
              path: join(repo.extraction.path, task.archivedPath),
              destination: join(repo.workdir.path, HELM_DIR),
            })
          );
        } else {
          commands.push(
            this.taskCommander.download({
              downloadObj: { id: task.id },
              url: task.archivedPath,
              destination: join((repo.assets as BundlePath).path, task.name),
            })
          );
        }
      }
    }

    return commands;
  }

  private async preBundleCleanup(repositories?: RepositoryProfile[]): Promise<void> {
    const removable: BundlePath[] = [];

    const repositoriesToClean = repositories ?? this.provider.getRepositories();

    for (const repo of repositoriesToClean) {
      const paths = [repo.workdir, repo.extraction, repo.archive];
      removable.push(...paths.filter((path) => path.shouldRemove));
    }

    this.logger?.debug({ msg: `pre cleanup`, repositoriesToClean: repositoriesToClean.map((r) => r.id), paths: removable });

    await Promise.allSettled(removable.map(async (path) => rm(path.path, { recursive: true })));
  }

  private async postBundleCleanup(): Promise<void> {
    const bundleDir = join(this.config.workdir, this.bundleId);

    this.logger?.debug({ msg: `post cleanup`, paths: bundleDir });

    await rm(bundleDir, { recursive: true });
  }

  private async createArchive(): Promise<void> {
    const bundleDir = join(this.config.workdir, this.bundleId);

    this.logger?.info({ msg: 'creating tar.gz bundle', outputPath: this.config.outputPath, cwd: bundleDir });

    await mkdir(dirname(this.config.outputPath), { recursive: true });
    await tar.create({ cwd: bundleDir, file: this.config.outputPath, gzip: true }, ['.']);
  }

  private async onBuildCompleted(image: Image): Promise<void> {
    this.logger?.info({ msg: 'buildCompleted', image });

    const repo = this.provider.getRepositoryByTaskId(image.id) as Readonly<RepositoryProfile>;
    this.provider.patchTask(image.id, { stage: TaskStage.SAVING });

    this.emitStatusUpdated();

    await this.taskCommander.save({ image, path: join(repo.workdir.path, BundleDirs.IMAGES, `${image.name}-${image.tag}.${TAR_FORMAT}`) });
  }

  private async onPullCompleted(image: Image): Promise<void> {
    this.logger?.info({ msg: 'pullCompleted', image });

    const repo = this.provider.getRepositoryByTaskId(image.id) as Readonly<RepositoryProfile>;
    this.provider.patchTask(image.id, { stage: TaskStage.SAVING });

    this.emitStatusUpdated();

    const args: DockerSaveArgs = {
      image,
      registry: DEFAULT_CONTAINER_REGISTRY,
      path: join(repo.workdir.path, BundleDirs.IMAGES, `${image.name}-${image.tag}.${TAR_FORMAT}`),
    };

    if (repo.buildImageLocally === false) {
      args.registry = DEFAULT_CONTAINER_REGISTRY;
    }

    await this.taskCommander.save(args);
  }

  private async onPackageCompleted(helmPackage: HelmPackage): Promise<void> {
    this.logger?.info({ msg: 'packageCompleted', helmPackage });

    let repo = this.provider.getRepositoryByTaskId(helmPackage.id) as Readonly<RepositoryProfile>;
    this.provider.patchTask(helmPackage.id, { status: Status.SUCCESS, stage: undefined });
    this.provider.patchRepository(repo.id, { completed: repo.completed + 1 });

    if (this.config.cleanupMode === 'on-the-fly') {
      repo = this.provider.getRepositoryById(repo.id) as Readonly<RepositoryProfile>;
      if (repo.completed === repo.tasks.length) {
        await this.preBundleCleanup([repo]);
      }
    }

    this.tasksCompleted++;
    this.emitStatusUpdated();
  }

  private onDownloadCompleted(downloadObj: DownloadObject): void {
    this.logger?.info({ msg: 'downloadCompleted', downloadObj });

    const repo = this.provider.getRepositoryByTaskId(downloadObj.id) as Readonly<RepositoryProfile>;
    this.provider.patchTask(downloadObj.id, { status: Status.SUCCESS, stage: undefined });
    this.provider.patchRepository(repo.id, { completed: repo.completed + 1 });

    this.tasksCompleted++;
    this.emitStatusUpdated();
  }

  private async onSaveCompleted(image: Image): Promise<void> {
    this.logger?.info({ msg: 'saveCompleted', image });

    let repo = this.provider.getRepositoryByTaskId(image.id) as Readonly<RepositoryProfile>;
    this.provider.patchTask(image.id, { status: Status.SUCCESS, stage: undefined });
    this.provider.patchRepository(repo.id, { completed: repo.completed + 1 });

    if (this.config.cleanupMode === 'on-the-fly') {
      repo = this.provider.getRepositoryById(repo.id) as Readonly<RepositoryProfile>;
      if (repo.completed === repo.tasks.length) {
        await this.preBundleCleanup([repo]);
      }
    }

    this.tasksCompleted++;
    this.emitStatusUpdated();
  }

  private async onCommandFailed(failedObj: { id: string }, error: unknown, message?: string): Promise<void> {
    const repo = this.provider.getRepositoryByTaskId(failedObj.id) as Readonly<RepositoryProfile>;
    const { tasks, ...repoWithoutTasks } = repo;
    const task = repo.tasks.find((task) => task.id === failedObj.id);

    this.logger?.error({ msg: 'commandFailed', failedObj, repository: repoWithoutTasks, task, err: error, message });

    this.taskCommander.terminate();
    if (this.config.cleanupMode !== 'none') {
      await this.postBundleCleanup();
    }

    this.emitStatusUpdated(BundlerStage.FAILURE);
  }

  private onTerminateCompleted(result: TerminationResult): void {
    this.logger?.debug({ msg: 'terminateCompleted', result });
  }

  private async createOutputs(): Promise<void> {
    this.emitStatusUpdated(BundlerStage.ARCHIVE);

    if (this.config.cleanupMode === 'post') {
      await this.preBundleCleanup();
    }

    const baseOutput = {
      id: this.bundleId,
      hostname: hostname(),
      createdAt: new Date().toISOString(),
      destination: this.config.outputPath,
    };

    await this.createManifest(baseOutput);

    await this.createArchive();

    this.emitStatusUpdated(BundlerStage.CHECKSUM);

    await this.createChecksum(baseOutput);

    if (this.config.cleanupMode !== 'none') {
      await this.postBundleCleanup();
    }

    this.emitStatusUpdated(BundlerStage.DONE);
  }

  private async createManifest(base: BaseOutput): Promise<void> {
    const manifest: Manifest = {
      ...base,
      ...manifestRepositories(this.provider.getRepositories()),
    };

    await writeFile(join(this.config.workdir, this.bundleId, MANIFEST_FILE), dump(manifest));
  }

  private async createChecksum(base: BaseOutput): Promise<void> {
    const bundleChecksum = await checksumFile(this.config.outputPath);

    const checksumOutput: ChecksumOutput = {
      ...base,
      destination: `${this.config.outputPath}-${CHECKSUM_FILE}`,
      checksum: bundleChecksum,
    };

    await writeFile(checksumOutput.destination, dump(checksumOutput));
  }

  private emitStatusUpdated(stage?: BundlerStage): void {
    this.stage = stage ?? this.stage;
    this.eventOccurred = true;
    this.emit('statusUpdated', this.status);
    this.logger?.debug({ msg: 'status updated', status: this.status });
  }
}
