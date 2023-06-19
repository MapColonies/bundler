import { join, basename } from 'path';
import { Bundler, BundlerOptions, CleanupMode, BundleStatus } from '@map-colonies/bundler-core';
import { IGithubClient } from '@map-colonies/bundler-github';
import { ExitCodes, MANIFEST_FILE, Repository, RepositoryId } from '@map-colonies/bundler-common';
import { FactoryFunction } from 'tsyringe';
import { Renderer, createTerminalStreamer, BundleStyleRequestBuilder as Builder } from '@map-colonies/bundler-terminal-ui';
import { Logger } from 'pino';
import { Arguments, Argv, CommandModule } from 'yargs';
import { dump } from 'js-yaml';
import { SERVICES, TERMINAL_STREAM } from '../../common/constants';
import { GlobalArguments } from '../../cliBuilderFactory';
import { check as checkWrapper } from '../../wrappers/check';
import { writeFileRecursive } from '../../common/util';
import { coerce as coerceWrapper } from '../../wrappers/coerce';
import { IConfig } from '../../config/configStore';
import { outputValidityCheck, repoProvidedCheck } from './checks';
import { inputCoerce, outputCoerce, repositoriesCoerce, repositoryCoerce } from './coerces';
import { command, describe, EXAMPLES } from './constants';

interface RequestArguments {
  input?: Repository[];
  repository?: RepositoryId;
  repositories?: RepositoryId[];
  buildImageLocally: boolean;
  includeMigrations: boolean;
  includeAssets: boolean;
  includeHelmPackage: boolean;
  override?: boolean;
}

export type BundleArguments = GlobalArguments & Required<Omit<BundlerOptions, 'logger' | 'githubClient' | 'provider'> & RequestArguments>;

export const bundleCommandFactory: FactoryFunction<CommandModule<GlobalArguments, BundleArguments>> = (dependencyContainer) => {
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);
  const configStore = dependencyContainer.resolve<IConfig>(SERVICES.CONFIG);

  const builder = (args: Argv<GlobalArguments>): Argv<BundleArguments> => {
    args
      .option('workdir', {
        alias: 'w',
        describe: 'the bundler working directory',
        nargs: 1,
        type: 'string',
        default: configStore.get<string>('workdir'),
      })
      .option('outputPath', {
        alias: 'o',
        describe: 'the bundler output file path',
        nargs: 1,
        type: 'string',
        demandOption: true,
      })
      .option('override', { alias: 'O', describe: 'potentially override an existing output file path', type: 'boolean', default: false })
      .option('cleanupMode', {
        alias: 'c',
        describe: 'the bundle execution cleanup mode',
        choices: ['none', 'on-the-fly', 'post'] as CleanupMode[],
        nargs: 1,
        type: 'string',
        default: 'on-the-fly' as CleanupMode,
      })
      .option('isDebugMode', { alias: ['d', 'debug'], describe: 'child processes logs will be logged', type: 'boolean', default: false })
      .option('buildImageLocally', {
        alias: ['l', 'build-image-locally'],
        describe: 'build image(s) locally',
        type: 'boolean',
        default: false,
      })
      .option('includeMigrations', {
        alias: ['m', 'include-migrations'],
        describe: 'include the migrations image of given repository',
        type: 'boolean',
        default: false,
      })
      .option('includeAssets', {
        alias: ['a', 'include-assets'],
        describe: 'include the release assets of given repository',
        type: 'boolean',
        default: false,
      })
      .option('includeHelmPackage', {
        alias: ['H', 'include-helm-package'],
        describe: 'include the packages helm chart of given repository',
        type: 'boolean',
        default: false,
      })
      .option('repository', {
        alias: ['r', 'repo'],
        describe: 'the repository to bundle',
        nargs: 1,
        type: 'string',
        conflicts: ['repositories', 'input'],
      })
      .option('repositories', {
        alias: ['R', 'repos'],
        describe: 'the repositories to bundle',
        array: true,
        type: 'string',
        conflicts: ['repository', 'input'],
      })
      .option('input', {
        alias: 'i',
        describe: 'input file request',
        type: 'string',
        conflicts: ['repository', 'repositories'],
      })
      .check(checkWrapper(repoProvidedCheck, logger))
      .check(checkWrapper(outputValidityCheck, logger))
      .coerce('input', coerceWrapper(inputCoerce, logger))
      .coerce('outputPath', coerceWrapper(outputCoerce, logger))
      .coerce('repository', coerceWrapper(repositoryCoerce, logger))
      .coerce('repositories', coerceWrapper(repositoriesCoerce, logger));

    for (const example of EXAMPLES) {
      args.example(example.command, example.description);
    }

    return args as Argv<BundleArguments>;
  };

  const handler = async (args: Arguments<BundleArguments>): Promise<void> => {
    const {
      workdir,
      outputPath,
      cleanupMode,
      isDebugMode,
      verbose,
      input,
      repositories,
      repository,
      buildImageLocally,
      includeMigrations,
      includeAssets,
      includeHelmPackage,
    } = args;

    const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);
    const githubClient = dependencyContainer.resolve<IGithubClient>(SERVICES.GITHUB_CLIENT);

    let bundleRequest = input;

    if ((input as Repository[] | undefined) === undefined) {
      const reposInput = (repository as RepositoryId | undefined) ? [repository] : repositories;
      bundleRequest = reposInput.map((repoId) => ({ id: repoId, buildImageLocally, includeMigrations, includeAssets, includeHelmPackage }));
    }

    logger.info({ msg: 'executing command', command, args: { workdir, outputPath, cleanupMode, isDebugMode, verbose }, payload: bundleRequest });

    const bundler = new Bundler({ workdir, outputPath, cleanupMode, isDebugMode, verbose, githubClient, logger });

    bundler.on('manifestCreated', async (manifest) => {
      const path = join(configStore.get<string>('historyDir'), manifest.createdAt, MANIFEST_FILE);
      await writeFileRecursive(path, dump(manifest));
    });

    bundler.on('checksumCreated', async (checksum) => {
      const path = join(configStore.get<string>('historyDir'), checksum.createdAt, basename(checksum.destination));
      await writeFileRecursive(path, dump(checksum));
    });

    if (!verbose) {
      const renderer = new Renderer(createTerminalStreamer(TERMINAL_STREAM));
      const builder = new Builder();
      bundler.on('statusUpdated', (status: BundleStatus) => {
        const request = builder.build(status);
        renderer.current = request;
      });
    }

    await bundler.bundle(bundleRequest);

    process.exitCode = ExitCodes.SUCCESS;
  };

  return {
    command,
    describe,
    builder,
    handler,
  };
};
