import { FactoryFunction } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { GithubRepository, RepositoryType, IGithubClient } from '@bundler/github';
import { GITHUB_ORG } from '@bundler/core';
import { Arguments, Argv, CommandModule } from 'yargs';
import { GlobalArguments } from '../../cliBuilderFactory';
import { ExitCodes, EXIT_CODE, SERVICES } from '../../common/constants';
import { checkWrapper } from '../../wrappers/check';
import { command, describe } from './constants';
import { visibilityTokenImplicationCheck } from './checks';

export interface ListArguments extends GlobalArguments {
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
      .option('topics', { alias: 't', describe: 'filter by topics', array: true, type: 'string' })
      .check(checkWrapper(visibilityTokenImplicationCheck, logger));

    return args as Argv<ListArguments>;
  };

  const handler = async (args: Arguments<ListArguments>): Promise<void> => {
    const { visibility, topics } = args;

    const githubClient = dependencyContainer.resolve<IGithubClient>(SERVICES.GITHUB_CLIENT);

    const filter = topics ? { topics } : undefined;

    logger.debug({ msg: 'executing command', command, args: { visibility, topics }, filter });

    try {
      // TODO: spinify
      // TODO: table print
      const repos: GithubRepository[] = await githubClient.listRepositories(GITHUB_ORG, visibility, filter);

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
