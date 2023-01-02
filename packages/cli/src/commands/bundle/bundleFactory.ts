import { Bundler, Repository, BundlerOptions } from '@bundler/core';
import { FactoryFunction } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { Arguments, Argv, CommandModule } from 'yargs';
import { ExitCodes, EXIT_CODE, SERVICES } from '../../common/constants';
import { GlobalArguments } from '../../cliBuilderFactory';

const PUBLIC_REPO = 'replica-server';
const OTHER_PUBLIC_REPO = 'microcOSM';
const PRIVATE_REPO = 'osm-sync-nifi';

const REPOSITORIES: Repository[] = [
  { id: { name: PUBLIC_REPO, ref: 'v1.0.1' }, buildImageLocally: false, includeMigrations: true },
  { id: { name: PUBLIC_REPO, ref: 'v1.0.0' }, buildImageLocally: true, includeMigrations: false },
  // { id: { name: OTHER_PUBLIC_REPO, ref: 'main' }, buildImageLocally: true },
  { id: { name: PRIVATE_REPO }, buildImageLocally: true },
];

type BundleArguments = GlobalArguments & Required<BundlerOptions>;

const command = 'bundle';

const describe = 'bundle github repositories into a single archive';

export const BUNDLE_COMMAND_FACTORY = Symbol('BundleCommandFactory');

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
        describe: 'the bundler archive output file path',
        nargs: 1,
        type: 'string',
        demandOption: true,
      })
      .option('cleanupMode', {
        alias: 'c',
        describe: 'the bundle execution cleanup mode',
        choices: ['none', 'on-the-fly', 'post'],
        default: 'on-the-fly',
      })
      .option('isDebugMode', { alias: ['d', 'debug'], describe: 'execute in debug mode', nargs: 1, type: 'boolean', default: false });

    return args as Argv<BundleArguments>;
  };

  const handler = async (args: Arguments<BundleArguments>): Promise<void> => {
    const { workdir, outputPath, cleanupMode, isDebugMode, verbose } = args;

    logger.debug({ msg: 'executing command', command, args: { workdir, outputPath, cleanupMode, isDebugMode, verbose } });

    try {
      const bundler = new Bundler({ workdir, outputPath, cleanupMode, isDebugMode, verbose, logger });
      await bundler.bundle(REPOSITORIES);

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
