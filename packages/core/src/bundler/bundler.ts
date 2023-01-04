import { mkdir, rm } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { nanoid } from 'nanoid';
import { RepositoryId ,downloadRepository } from '@bundler/github';
import * as tar from 'tar';
import { writeBuffer } from '../fs';
// import { GITHUB_ORG } from '../github/constants';
import { dockerfileNameToKind } from '../processes/docker';
import { DockerCommander } from '../processes/dockerCommander';
import { DockerKind } from '../processes/types';
import { DockerSaveArgs, Image } from '../processes/interfaces';
import { ILogger } from '../common/types';
import { BundlerOptions, BundlePath, Repository, RepositoryProfile } from './interfaces';
import {
  DEFAULT_BRANCH,
  DOCKER_FILE,
  TAR_FORMAT,
  MIGRATIONS_DOCKER_FILE,
  TAR_GZIP_ARCHIVE_FORMAT,
  DEFAULT_CONTAINER_REGISTRY,
  IMAGES_DIR,
  DEFAULT_OPTIONS,
  DEFAULT_GITHUB_ORG,
} from './constants';

const stringifyRepositoryId = (id: RepositoryId): string => {
  return `${id.owner ?? DEFAULT_GITHUB_ORG}-${id.name}-${id.ref ?? DEFAULT_BRANCH}`;
};

export class Bundler {
  private readonly commander: DockerCommander;
  private readonly logger: ILogger | undefined;

  private bundleId: string = nanoid();
  private repositoryProfiles: RepositoryProfile[] = [];
  private tasksTotal = 0;
  private tasksCompleted = 0;

  // TODO generic docker worker and github interface
  // TODO: handle verbosity and logging including for commands
  public constructor(private readonly config: BundlerOptions = DEFAULT_OPTIONS) {
    this.logger = config.logger;
    this.commander = new DockerCommander({ verbose: config.verbose, logger: this.logger });

    this.commander.on('buildCompleted', this.onBuildCompleted.bind(this));
    this.commander.on('pullCompleted', this.onPullCompleted.bind(this));
  }

  // TODO: bundle name as arg
  public async bundle(repositories: Repository[]): Promise<void> {
    this.reset();

    this.repositoryProfiles.push(...repositories.map((repo) => this.determineBaseRepositoryProfile(repo)));

    await this.download();
    await this.profileRepositories();
    const commands = this.constructCommands();

    const promisifyTasksChain = new Promise((resolve, reject) => {
      this.commander.on('saveCompleted', async (image) => {
        const allTasksCompleted = await this.onSaveCompleted(image);
        if (allTasksCompleted) {
          resolve(await this.createOutput());
        }
      });
      this.commander.once('commandFailed', async (image, error, message) => {
        await this.onCommandFailed(image, error, message);
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
      path: join(repoWorkdir.path, `${repository.id.name}-${repository.id.ref ?? DEFAULT_BRANCH}-sourcecode.${TAR_GZIP_ARCHIVE_FORMAT}`),
      shouldMake: false,
      shouldRemove: false,
    };

    const extractionDir: BundlePath = { path: join(repoWorkdir.path, nanoid()), shouldMake: true, shouldRemove: true };

    return {
      ...repository,
      id: { ...repository.id, name: repository.id.name.toLowerCase() },
      workdir: repoWorkdir,
      archive: repoArchivePath,
      extraction: extractionDir,
      dockerfiles: [],
    };
  }

  private async download(): Promise<void> {
    for (const repo of this.repositoryProfiles) {
      const arrayBuffer = await downloadRepository({ ...repo.id, owner: repo.id.owner ?? DEFAULT_GITHUB_ORG, ref: repo.id.ref ?? 'master' }, 'tarball');

      await mkdir(repo.workdir.path, { recursive: true });

      await writeBuffer(arrayBuffer, repo.archive.path);
    }
  }

  private async profileRepositories(): Promise<void> {
    for (const repo of this.repositoryProfiles) {
      const lookup = repo.includeMigrations === true ? [DOCKER_FILE, MIGRATIONS_DOCKER_FILE] : [DOCKER_FILE];

      await tar.list({
        file: repo.archive.path,
        filter: (path) => lookup.includes(basename(path)),
        onentry: (entry) => repo.dockerfiles.push({ id: nanoid(), archivedPath: entry.path, kind: dockerfileNameToKind(basename(entry.path)) }),
      });

      if (repo.dockerfiles.length > 0) {
        this.tasksTotal += repo.dockerfiles.length;

        await mkdir(repo.extraction.path, { recursive: true });

        await tar.extract({ file: repo.archive.path, cwd: repo.extraction.path });

        await mkdir(join(repo.workdir.path, IMAGES_DIR));
      }
    }
  }

  private constructCommands(): Promise<unknown>[] {
    const commands: Promise<unknown>[] = [];

    for (const repo of this.repositoryProfiles) {
      for (const dockerfile of repo.dockerfiles) {
        const image = {
          id: dockerfile.id,
          name: dockerfile.kind === DockerKind.MIGRATION ? `${repo.id.name}-migrations` : repo.id.name,
          tag: repo.id.ref ?? 'latest',
        };

        if (repo.buildImageLocally === true) {
          const dockerBuildArgs = {
            dockerFile: join(repo.extraction.path, dockerfile.archivedPath),
            path: join(repo.extraction.path, dirname(dockerfile.archivedPath)),
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
    await tar.create({ cwd: bundleDir, file: this.config.outputPath, gzip: true }, ['.']);
  }

  private async onBuildCompleted(image: Image): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'buildCompleted', image });

    const repo = this.imageToRepositoryLookup(image);

    await this.commander.save({ image, path: join(repo.workdir.path, IMAGES_DIR, `${image.name}-${image.tag}.${TAR_FORMAT}`) });
  }

  private async onPullCompleted(image: Image): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'pullCompleted', image });

    const repo = this.imageToRepositoryLookup(image);

    const args: DockerSaveArgs = { image, path: join(repo.workdir.path, IMAGES_DIR, `${image.name}-${image.tag}.${TAR_FORMAT}`) };

    if (repo.buildImageLocally === false) {
      args.registry = DEFAULT_CONTAINER_REGISTRY;
    }

    await this.commander.save(args);
  }

  private async onSaveCompleted(image: Image): Promise<boolean> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'saveCompleted', image });

    this.tasksCompleted++;

    if (this.config.cleanupMode === 'on-the-fly') {
      const repo = this.imageToRepositoryLookup(image);
      await this.preBundleCleanup([repo]);
    }

    return this.tasksCompleted === this.tasksTotal;
  }

  private async onCommandFailed(image: Image, error: unknown, message?: string): Promise<void> {
    this.logger?.info({ bundleId: this.bundleId, msg: 'commandFailed', image, error, message });

    this.commander.terminate();
    await this.postBundleCleanup();
    throw error;
  }

  private imageToRepositoryLookup(image: Image): RepositoryProfile {
    return this.repositoryProfiles.find((repo) => repo.dockerfiles.find((df) => df.id === image.id)) as RepositoryProfile;
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
