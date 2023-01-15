import { EOL } from 'os';
import { Bundler, BundlerOptions, CleanupMode, BundleStatus } from '@bundler/core';
import { IGithubClient, RepositoryId } from '@bundler/github';
import { FactoryFunction } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { Arguments, Argv, CommandModule } from 'yargs';
import { ExitCodes, EXIT_CODE, SERVICES, Status } from '../../common/constants';
import { GlobalArguments } from '../../cliBuilderFactory';
import { checkWrapper } from '../../wrappers/check';
import { coerceWrapper } from '../../wrappers/coerce';
import { Content, ExtendedColumnifyOptions, style, Title } from '../../ui/styler';
import { oldCreateTerminalStreamer, createTerminalStreamer } from '../../ui/terminalStreamer';
import { Renderer } from '../../ui/renderer';
import { repoProvidedCheck } from './checks';
import { repositoriesCoerce, repositoryCoerce } from './coerces';
import { BUNDLE_FAILED_MESSAGE, BUNDLE_SUCCESS_MESSAGE, command, describe, PREFIX } from './constants';

interface BundleRequest {
  repository?: RepositoryId;
  repositories?: RepositoryId[];
  buildImageLocally: boolean;
  includeMigrations: boolean;
  includeAssets: boolean;
  includeHelmPackage: boolean;
}

const columnifyOptions: ExtendedColumnifyOptions = {
  align: 'left',
  preserveNewLines: true,
  columns: ['content', 'name', 'description'],
  showHeaders: false,
  columnSplitter: '   ',
};

export type BundleArguments = GlobalArguments & Required<Omit<BundlerOptions, 'logger' | 'githubClient'> & BundleRequest>;

export const bundleCommandFactory: FactoryFunction<CommandModule<GlobalArguments, BundleArguments>> = (dependencyContainer) => {
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);

  const builder = (args: Argv<GlobalArguments>): Argv<BundleArguments> => {
    args
      .option('workdir', {
        alias: 'w',
        describe: 'the bundler working directory',
        nargs: 1,
        type: 'string',
        demandOption: true,
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

    const githubClient = dependencyContainer.resolve<IGithubClient>(SERVICES.GITHUB_CLIENT);

    const reposInput = (repository as RepositoryId | undefined) ? [repository] : repositories;
    const bundleRequest = reposInput.map((repoId) => ({ id: repoId, buildImageLocally, includeMigrations, includeAssets, includeHelmPackage }));

    logger.debug({ msg: 'executing command', command, args: { workdir, outputPath, cleanupMode, isDebugMode, verbose }, payload: bundleRequest });

    try {
      const bundler = new Bundler({ workdir, outputPath, cleanupMode, isDebugMode, verbose, githubClient });
      const renderer = new Renderer(createTerminalStreamer(process.stderr));
      bundler.on('statusUpdated', (status: BundleStatus) => renderer.update(status));

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
