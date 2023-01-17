import { ExitCodes, Status } from '@bundler/common';
import { Renderer, createTerminalStreamer, ListStyleRequestBuilder as Builder } from '@bundler/terminal-ui';
import { FactoryFunction } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { GithubRepository, RepositoryType, IGithubClient } from '@bundler/github';
import { GITHUB_ORG } from '@bundler/core';
import { Arguments, Argv, CommandModule } from 'yargs';
import { GlobalArguments } from '../../cliBuilderFactory';
import { EXIT_CODE, SERVICES, TERMINAL_STREAM } from '../../common/constants';
import { checkWrapper } from '../../wrappers/check';
import { command, describe } from './constants';
import { visibilityTokenImplicationCheck } from './checks';

export interface Listed extends Pick<GithubRepository, 'name' | 'language' | 'topics'> {
  status: Status;
}

export interface ListArguments extends GlobalArguments {
  visibility: RepositoryType;
  topics?: string[];
}

export const listCommandFactory: FactoryFunction<CommandModule<GlobalArguments, ListArguments>> = (dependencyContainer) => {
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
      .check(checkWrapper(visibilityTokenImplicationCheck));

    return args as Argv<ListArguments>;
  };

  const handler = async (args: Arguments<ListArguments>): Promise<void> => {
    const { visibility, topics } = args;

    const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);
    const githubClient = dependencyContainer.resolve<IGithubClient>(SERVICES.GITHUB_CLIENT);

    const filter = topics ? { topics, archived: false } : { archived: false };

    logger.debug({ msg: 'blabla', command, args: { visibility, topics }, filter });

    try {
      const renderer = new Renderer(createTerminalStreamer(TERMINAL_STREAM));
      const builder = new Builder();
      renderer.current = builder.build({ list: [], status: Status.PENDING });

      const filtered: Listed[] = [];

      for await (const repos of githubClient.listRepositoriesGenerator(GITHUB_ORG, visibility, filter)) {
        if (repos.length === 0) {
          // const request = builder.build({ list: filtered, status: Status.SUCCESS });
          // renderer.current = request;
          break;
        }

        filtered.push(...repos.map((r) => ({ name: r.name, language: r.language, topics: r.topics, status: Status.PENDING })));
        // const request = builder.build({ list: filtered, status: Status.PENDING });
        // renderer.current = request;
      }

      logger.debug({ msg: 'got repositories', count: filtered.length });

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
