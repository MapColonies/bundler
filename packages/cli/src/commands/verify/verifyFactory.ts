/* eslint-disable @typescript-eslint/no-magic-numbers */
import { FactoryFunction } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { IGithubClient } from '@bundler/github';
import { CommandModule } from 'yargs';
import chalk from 'chalk';
import { dockerVerify, helmVerify } from '@bundler/core';
import { GlobalArguments } from '../../cliBuilderFactory';
import { ExitCodes, EXIT_CODE, LifeCycle, SERVICES, Status } from '../../common/constants';
import { createTerminalStreamer } from '../../ui/terminalStreamer';
import { ExtendedColumnifyOptions, styleFunc } from '../../ui/styler';
import { command, describe, NOT_VERIFIED_MESSAGE, PREFIX, VERIFIED_MESSAGE } from './constants';

const promiseResult = async <T>(promise: Promise<T>): Promise<[undefined, T] | [unknown, undefined]> => {
  try {
    const value = await promise;
    return [undefined, value];
  } catch (error) {
    return [error !== undefined ? error : new Error('internal promise rejected with undefined'), undefined];
  }
};

interface VerifyEntity {
  name: string;
  verification: Promise<void>;
}

const columnifyOptions: ExtendedColumnifyOptions = {
  align: 'left',
  preserveNewLines: true,
  columns: ['content', 'name', 'reason'],
  showHeaders: false,
  columnSplitter: '   ',
  config: { content: { align: 'center' }, reason: { maxWidth: 80 } },
};

export interface VerifyResult {
  name: string;
  status: Status;
  content?: string;
  reason?: Error;
}

export const verifyCommandFactory: FactoryFunction<CommandModule<GlobalArguments, GlobalArguments>> = (dependencyContainer) => {
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);

  const handler = async (): Promise<void> => {
    const githubClient = dependencyContainer.resolve<IGithubClient>(SERVICES.GITHUB_CLIENT);

    logger.debug({ msg: 'executing command', command });

    try {
      const entities: VerifyEntity[] = [
        {
          name: 'docker',
          verification: dockerVerify(),
        },
        {
          name: 'github',
          verification: githubClient.ping(),
        },
        {
          name: 'helm',
          verification: helmVerify(),
        },
      ];

      const results: VerifyResult[] = entities.map((entity) => ({
        name: entity.name,
        status: Status.PENDING,
      }));

      let cycle = LifeCycle.PRE;

      const getData = (): string => {
        if (cycle === LifeCycle.PRE) {
          const main = [{ level: 3, status: Status.PENDING, content: { data: results, config: columnifyOptions } }];
          return styleFunc({ prefix: { content: PREFIX(command), isBold: true, status: Status.PENDING }, main });
        }
        const status = results.every((entity) => entity.status === Status.SUCCESS) ? Status.SUCCESS : Status.FAILURE;

        const main = [{ level: 3, status, content: { data: results, config: columnifyOptions } }];
        const message = status === Status.SUCCESS ? VERIFIED_MESSAGE : NOT_VERIFIED_MESSAGE;
        return styleFunc({
          prefix: { content: PREFIX(command), isBold: true, status },
          suffix: { content: message, level: 3, isBold: true, status },
          main,
        });
      };

      createTerminalStreamer(process.stderr, getData);

      await Promise.allSettled(
        entities.map(async (entity, index) => {
          await promiseResult(entity.verification).then(([error]) => {
            if (error === undefined) {
              results[index] = { ...results[index], status: Status.SUCCESS };
            } else {
              results[index] = { ...results[index], status: Status.FAILURE, reason: error as Error };
            }
          });
        })
      );

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
    handler,
  };
};
