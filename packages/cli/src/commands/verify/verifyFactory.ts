import { ExitCodes, ILogger, Status, VerifyEntity } from '@bundler/common';
import { FactoryFunction } from 'tsyringe';
import { Logger } from 'pino';
import { IGithubClient } from '@bundler/github';
import { Argv, CommandModule } from 'yargs';
import { Renderer, createTerminalStreamer, VerifyStyleRequestBuilder as Builder } from '@bundler/terminal-ui';
import { dockerVersion as dockerVerify, helmVersion as helmVerify } from '@bundler/child-process';
import { GlobalArguments } from '../../cliBuilderFactory';
import { SERVICES, TERMINAL_STREAM } from '../../common/constants';
import { command, describe } from './constants';
import { promiseResult } from './util';

export const verifyCommandFactory: FactoryFunction<CommandModule<GlobalArguments, GlobalArguments>> = (dependencyContainer) => {
  const builder = (args: Argv<GlobalArguments>): Argv<GlobalArguments> => {
    args.example('$0 verify --token X', '>>  verifies the environment including the verification of given token X');

    return args;
  };

  const handler = async (args: GlobalArguments): Promise<void> => {
    const { verbose } = args;

    const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);
    const githubClient = dependencyContainer.resolve<IGithubClient>(SERVICES.GITHUB_CLIENT);

    logger.debug({ msg: 'executing command', command });

    let childLogger: ILogger | undefined = undefined;
    if (verbose) {
      childLogger = logger.child({}, { level: 'debug' });
    }

    const verifications: VerifyEntity[] = [
      {
        name: 'docker',
        verification: dockerVerify({ logger: childLogger }),
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
        verification: helmVerify({ logger: childLogger }),
        result: {
          status: Status.PENDING,
        },
      },
    ];

    let renderer: Renderer | undefined;
    let builder: Builder | undefined;

    if (!verbose) {
      renderer = new Renderer(createTerminalStreamer(TERMINAL_STREAM));
      builder = new Builder();
      renderer.current = builder.build(verifications);
    }

    await Promise.allSettled(
      verifications.map(async (entity, index) => {
        await promiseResult(entity.verification).then(([error]) => {
          if (error === undefined) {
            verifications[index] = { ...verifications[index], result: { status: Status.SUCCESS } };
          } else {
            verifications[index] = { ...verifications[index], result: { status: Status.FAILURE, reason: error as Error } };
          }

          logger.debug({ msg: 'verification result', entity: verifications[index] });
          (renderer as Renderer).current = (builder as Builder).build(verifications);
        });
      })
    );

    process.exitCode = ExitCodes.SUCCESS;
  };

  return {
    command,
    describe,
    builder,
    handler,
  };
};
