/* eslint-disable import/first */
// this import must be called before the first import of tsyring
import 'reflect-metadata';
import { ExitCodes } from '@bundler/common';
import { hideBin } from 'yargs/helpers';
import { Logger } from 'pino';
import { DependencyContainer } from 'tsyringe';
import { EXIT_CODE, ON_SIGNAL, SERVICES } from './common/constants';
import { getCli } from './cli';

let depContainer: DependencyContainer | undefined;

void getCli()
  .then(async ([container, cli]) => {
    depContainer = container;
    await cli.parseAsync(hideBin(process.argv));

    const exitCode = depContainer.isRegistered(EXIT_CODE) ? depContainer.resolve<number>(EXIT_CODE) : ExitCodes.GENERAL_ERROR;
    if (exitCode === ExitCodes.SUCCESS && depContainer.isRegistered(ON_SIGNAL)) {
      const shutDown: () => Promise<void> = depContainer.resolve(ON_SIGNAL);
      await shutDown();
    }
  })
  .catch((error: Error) => {
    const errorLogger =
      depContainer?.isRegistered(SERVICES.LOGGER) === true
        ? depContainer.resolve<Logger>(SERVICES.LOGGER).error.bind(depContainer.resolve<Logger>(SERVICES.LOGGER))
        : console.error;

    errorLogger({ msg: 'failed to initialize the cli', err: error });
  })
  .finally(() => {
    const exitCode = depContainer?.isRegistered(EXIT_CODE) === true ? depContainer.resolve<number>(EXIT_CODE) : ExitCodes.GENERAL_ERROR;
    process.exit(exitCode);
  });
