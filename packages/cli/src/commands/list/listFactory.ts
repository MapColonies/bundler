import { ExitCodes, Status } from '@bundler/common';
import { Renderer, createTerminalStreamer, ListStyleRequestBuilder as Builder } from '@bundler/terminal-ui';
import { FactoryFunction } from 'tsyringe';
import { Logger } from 'pino';
import { GithubRepository, RepositoryType, IGithubClient } from '@bundler/github';
import { GITHUB_ORG } from '@bundler/common';
import { Arguments, Argv, CommandModule } from 'yargs';
import { GlobalArguments } from '../../cliBuilderFactory';
import { SERVICES, TERMINAL_STREAM } from '../../common/constants';
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
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);

  const builder = (args: Argv<GlobalArguments>): Argv<ListArguments> => {
    args
      .option('visibility', {
        alias: 'V',
        describe: 'filter by repo visibility',
        choices: ['all', 'public', 'private'] as RepositoryType[],
        nargs: 1,
        type: 'string',
        default: 'all' as RepositoryType,
      })
      .option('topics', { alias: 'T', describe: 'filter by topics', array: true, type: 'string' })
      .check(checkWrapper(visibilityTokenImplicationCheck(dependencyContainer), logger))
      .example('$0 list -V public -T javascript docker helm', '>>  lists public repositories from the given topics');

    return args as Argv<ListArguments>;
  };

  const handler = async (args: Arguments<ListArguments>): Promise<void> => {
    const { visibility, topics, verbose } = args;

    const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);
    const githubClient = dependencyContainer.resolve<IGithubClient>(SERVICES.GITHUB_CLIENT);

    const filter = topics ? { topics, archived: false } : { archived: false };

    logger.info({ msg: 'executing command', command, args: { visibility, topics }, filter });

    let renderer: Renderer | undefined;
    let builder: Builder | undefined;

    if (!verbose) {
      renderer = new Renderer(createTerminalStreamer(TERMINAL_STREAM));
      builder = new Builder();
      renderer.current = builder.build({ list: [], status: Status.PENDING });
    }

    const filtered: Listed[] = [];

    for await (const repos of githubClient.listRepositoriesGenerator(GITHUB_ORG, visibility, filter)) {
      if (repos.length === 0) {
        if (!verbose) {
          (renderer as Renderer).current = (builder as Builder).build({ list: filtered, status: Status.SUCCESS });
        }
        break;
      }

      filtered.push(...repos.map((r) => ({ name: r.name, language: r.language, topics: r.topics, status: Status.PENDING })));
      if (!verbose) {
        (renderer as Renderer).current = (builder as Builder).build({ list: filtered, status: Status.PENDING });
      }
    }

    logger.debug({ msg: 'got repositories', filter, count: filtered.length, repositories: filtered });

    process.exitCode = ExitCodes.SUCCESS;
  };

  return {
    command,
    describe,
    builder,
    handler,
  };
};
