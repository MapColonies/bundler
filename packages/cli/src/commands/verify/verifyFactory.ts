import { FactoryFunction } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { IGithubClient } from '@bundler/github';
import { CommandModule } from 'yargs';
import { dockerVerify, helmVerify } from '@bundler/core';
import { GlobalArguments } from '../../cliBuilderFactory';
import { ExitCodes, EXIT_CODE, SERVICES } from '../../common/constants';
import { command, describe } from './constants';

interface VerifyEntity {
  name: string;
  verification: Promise<void>;
}

export const verifyCommandFactory: FactoryFunction<CommandModule<GlobalArguments, GlobalArguments>> = (dependencyContainer) => {
  const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);

  const handler = async (): Promise<void> => {
    const githubClient = dependencyContainer.resolve<IGithubClient>(SERVICES.GITHUB_CLIENT);

    logger.debug({ msg: 'executing command', command });

    try {
      const entities: VerifyEntity[] = [
        {
          name: 'github',
          verification: githubClient.ping(),
        },
        {
          name: 'docker',
          verification: dockerVerify(),
        },
        {
          name: 'helm',
          verification: helmVerify(),
        },
      ];

      const results = await Promise.allSettled(entities.map(async (entity) => entity.verification));

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          process.stdout.write(JSON.stringify({ name: entities[index].name, status: 'verified' }));
        } else {
          process.stdout.write(JSON.stringify({ name: entities[index].name, status: 'not verified', reason: result.reason as Error }));
        }
      });
      process.stdout.write(JSON.stringify('done'));
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
