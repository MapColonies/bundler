import { ExitCodes } from '@bundler/common';
import { Bundler, BundlerOptions, CleanupMode, BundleStatus } from '@bundler/core';
import { IGithubClient, RepositoryId } from '@bundler/github';
import { FactoryFunction } from 'tsyringe';
import { Renderer, createTerminalStreamer, BundleStyleRequestBuilder as Builder } from '@bundler/terminal-ui';
import { Logger } from 'pino';
import { Arguments, Argv, CommandModule } from 'yargs';
import { EXIT_CODE, SERVICES, TERMINAL_STREAM } from '../../common/constants';
import { GlobalArguments } from '../../cliBuilderFactory';
import { checkWrapper } from '../../wrappers/check';
import { coerceWrapper } from '../../wrappers/coerce';
import { IConfig } from '../../config/configStore';
import { repoProvidedCheck } from './checks';
import { repositoriesCoerce, repositoryCoerce } from './coerces';
import { command, describe } from './constants';

interface BundleRequest {
  repository?: RepositoryId;
  repositories?: RepositoryId[];
  buildImageLocally: boolean;
  includeMigrations: boolean;
  includeAssets: boolean;
  includeHelmPackage: boolean;
}

export type BundleArguments = GlobalArguments & Required<Omit<BundlerOptions, 'logger' | 'githubClient'> & BundleRequest>;

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
      .option('cleanupMode', {
        alias: 'c',
        describe: 'the bundle execution cleanup mode',
        choices: ['none', 'on-the-fly', 'post'] as CleanupMode[],
        nargs: 1,
        type: 'string',
        default: 'on-the-fly' as CleanupMode,
      })
      .option('isDebugMode', { alias: ['d', 'debug'], describe: 'execute in debug mode', nargs: 1, type: 'boolean', default: false })
      .option('buildImageLocally', {
        alias: ['l', 'build-image-locally'],
        describe: 'build image(s) locally',
        nargs: 1,
        type: 'boolean',
        default: false,
      })
      .option('includeMigrations', {
        alias: ['m', 'include-migrations'],
        describe: 'include the migrations image of given repository',
        nargs: 1,
        type: 'boolean',
        default: false,
      })
      .option('includeAssets', {
        alias: ['a', 'include-assets'],
        describe: 'include the release assets of given repository',
        nargs: 1,
        type: 'boolean',
        default: false,
      })
      .option('includeHelmPackage', {
        alias: ['hp', 'include-helm-package'],
        describe: 'include the packages helm chart of given repository',
        nargs: 1,
        type: 'boolean',
        default: false,
      })
      .option('repository', { alias: 'repo', describe: 'the repository to bundle', nargs: 1, type: 'string', conflicts: ['repositories'] })
      .option('repositories', { alias: 'repos', describe: 'the repositories to bundle', array: true, type: 'string', conflicts: ['repository'] })
      .check(checkWrapper(repoProvidedCheck, logger))
      .coerce('repository', coerceWrapper(repositoryCoerce, logger))
      .coerce('repositories', coerceWrapper(repositoriesCoerce, logger));

    return args as Argv<BundleArguments>;
  };

  const handler = async (args: Arguments<BundleArguments>): Promise<void> => {
    const {
      workdir,
      outputPath,
      cleanupMode,
      isDebugMode,
      verbose,
      repositories,
      repository,
      buildImageLocally,
      includeMigrations,
      includeAssets,
      includeHelmPackage,
    } = args;

    const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);
    const githubClient = dependencyContainer.resolve<IGithubClient>(SERVICES.GITHUB_CLIENT);

    const reposInput = (repository as RepositoryId | undefined) ? [repository] : repositories;
    const bundleRequest = reposInput.map((repoId) => ({ id: repoId, buildImageLocally, includeMigrations, includeAssets, includeHelmPackage }));

    logger.info({ msg: 'executing command', command, args: { workdir, outputPath, cleanupMode, isDebugMode, verbose }, payload: bundleRequest });

    try {
      const bundler = new Bundler({ workdir, outputPath, cleanupMode, isDebugMode, verbose, githubClient, logger });
      if (!verbose) {
        const renderer = new Renderer(createTerminalStreamer(TERMINAL_STREAM));
        const builder = new Builder();
        bundler.on('statusUpdated', (status: BundleStatus) => {
          const request = builder.build(status);
          renderer.current = request;
        });
      }

      await bundler.bundle(bundleRequest);

      dependencyContainer.register(EXIT_CODE, { useValue: ExitCodes.SUCCESS });
    } catch (error) {
      dependencyContainer.register(EXIT_CODE, { useValue: ExitCodes.GENERAL_ERROR });
      logger.error({ err: error as Error, msg: 'an error occurred while executing command', command, exitCode: ExitCodes.GENERAL_ERROR });
    }
  };

  return {
    command,
    describe,
    builder,
    handler,
  };
};
