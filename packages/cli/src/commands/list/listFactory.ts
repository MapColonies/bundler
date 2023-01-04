import { FactoryFunction } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { getOrgRepositories, GithubRepository, RepositoryType } from '@bundler/github';
import { Arguments, Argv, CommandModule } from 'yargs';
import { ExitCodes, EXIT_CODE, SERVICES } from '../../common/constants';
import { GlobalArguments } from '../../cliBuilderFactory';
import { command, describe } from './constants';

interface ListArguments extends GlobalArguments {
    visibility: RepositoryType;
    topics?: string[];
}

export const listCommandFactory: FactoryFunction<CommandModule<GlobalArguments, ListArguments>> = (dependencyContainer) => {
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);

  const builder = (args: Argv<GlobalArguments>): Argv<ListArguments> => {
    args
      .option('visibility', {
        alias: 'vis',
        describe: 'filter by repo visibility',
        choices: ['all', 'public', 'private'] as RepositoryType[],
        nargs: 1,
        type: 'string',
        default: 'all' as RepositoryType,
      })
      .option('topics', { alias: 't', describe: 'filter by topics', array: true, type: 'string' });

    return args as Argv<ListArguments>;
  };

  const handler = async (args: Arguments<ListArguments>): Promise<void> => {
    const { visibility, topics } = args;

    const filter = topics ? { topics } : undefined;

    logger.debug({ msg: 'executing command', command, args: { visibility, topics }, filter });

    try {
      // TODO: fetch org name
      // TODO: spinify
      // TODO: table print
      const repos: GithubRepository[] = await getOrgRepositories('MapColonies', visibility, filter);

      logger.debug({ msg: 'got repositories', count: repos.length });

      const filtered = repos.map((r) => ({ name: r.name, language: r.language, topics: r.topics }));

      process.stdout.write(JSON.stringify(filtered));

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
