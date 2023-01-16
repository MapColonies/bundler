import { ExitCodes, Status, VerifyEntity } from '@bundler/common';
import { FactoryFunction } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { IGithubClient } from '@bundler/github';
import { CommandModule } from 'yargs';
import { Renderer, createTerminalStreamer, VerifyStyleRequestBuilder as Builder } from '@bundler/terminal-ui';
import { dockerVerify, helmVerify } from '@bundler/core';
import { GlobalArguments } from '../../cliBuilderFactory';
import { EXIT_CODE, SERVICES, TERMINAL_STREAM } from '../../common/constants';
import { command, describe } from './constants';

const promiseResult = async <T>(promise: Promise<T>): Promise<[undefined, T] | [unknown, undefined]> => {
  try {
    const value = await promise;
    return [undefined, value];
  } catch (error) {
    return [error !== undefined ? error : new Error('internal promise rejected with undefined'), undefined];
  }
};

export const verifyCommandFactory: FactoryFunction<CommandModule<GlobalArguments, GlobalArguments>> = (dependencyContainer) => {
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);

  const handler = async (): Promise<void> => {
    const githubClient = dependencyContainer.resolve<IGithubClient>(SERVICES.GITHUB_CLIENT);

    logger.debug({ msg: 'executing command', command });

    try {
      const verifications: VerifyEntity[] = [
        {
          name: 'docker',
          verification: dockerVerify(),
          result: {
            status: Status.PENDING,
          },
        },
        {
          name: 'github',
          verification: githubClient.ping(),
          result: {
            status: Status.PENDING,
          },
        },
        {
          name: 'helm',
          verification: helmVerify(),
          result: {
            status: Status.PENDING,
          },
        },
      ];

      const renderer = new Renderer(createTerminalStreamer(TERMINAL_STREAM));
      const builder = new Builder();
      renderer.current = builder.build(verifications);

      await Promise.allSettled(
        verifications.map(async (entity, index) => {
          await promiseResult(entity.verification).then(([error]) => {
            if (error === undefined) {
              verifications[index] = { ...verifications[index], result: { status: Status.SUCCESS } };
            } else {
              verifications[index] = { ...verifications[index], result: { status: Status.FAILURE, reason: error as Error } };
            }
            renderer.current = builder.build(verifications);
          });
        })
      );

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
