import { FactoryFunction } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { GithubRepository, RepositoryType, IGithubClient } from '@bundler/github';
import { GITHUB_ORG } from '@bundler/core';
import { Arguments, Argv, CommandModule } from 'yargs';
import chalk from 'chalk';
import { GlobalArguments } from '../../cliBuilderFactory';
import { ExitCodes, EXIT_CODE, LifeCycle, SERVICES, Status } from '../../common/constants';
import { checkWrapper } from '../../wrappers/check';
import { createTerminalStreamer } from '../../ui/terminalStreamer';
import { ExtendedColumnifyOptions, styleFunc } from '../../ui/styler';
import { command, describe, PREFIX } from './constants';
import { visibilityTokenImplicationCheck } from './checks';

const columnifyOptions: ExtendedColumnifyOptions = {
  align: 'left',
  preserveNewLines: true,
  columns: ['name', 'language', 'topics'],
  showHeaders: true,
  columnSplitter: '   ',
  alternateChalks: [chalk.bold.hex('#a5d4d3'), chalk.cyanBright],
};

interface Listed extends Pick<GithubRepository, 'name' | 'language' | 'topics'> {
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
      let filtered: Listed[] = [];

      let cycle = LifeCycle.PRE;

      const getData = (): string => {
        if (cycle === LifeCycle.PRE) {
          const main = [{ level: 3, status: Status.PENDING }];
          return styleFunc({ prefix: { content: PREFIX(command), isBold: true, status: Status.PENDING }, main });
        }
        const status = Status.SUCCESS;
        const main = [{ level: 3, status, content: { config: columnifyOptions, data: filtered } }];
        const suffix = { level: 3, status, isBold: true, content: ` listed ${filtered.length} repositories ` };
        return styleFunc({ prefix: { content: PREFIX(command), isBold: true, status }, main, suffix });
      };

      createTerminalStreamer(process.stderr, getData);

      const repos: GithubRepository[] = await githubClient.listRepositories(GITHUB_ORG, visibility, filter);

      // logger.debug({ msg: 'got repositories', count: repos.length });

      filtered = repos.map((r) => ({ name: r.name, language: r.language, topics: r.topics, status: Status.SUCCESS }));

      cycle = LifeCycle.POST;

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
