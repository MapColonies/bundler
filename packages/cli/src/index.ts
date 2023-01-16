/* eslint-disable import/first */
// this import must be called before the first import of tsyring
import 'reflect-metadata';
import { ExitCodes } from '@bundler/common';
import { hideBin } from 'yargs/helpers';
import { Logger } from '@map-colonies/js-logger';
import { EXIT_CODE, SERVICES } from './common/constants';
import { getCli } from './cli';

const [container, cli] = getCli();

void cli
  .parseAsync(hideBin(process.argv))
  .catch((error: Error) => {
    const errorLogger = container.isRegistered(SERVICES.LOGGER)
      ? container.resolve<Logger>(SERVICES.LOGGER).error.bind(container.resolve<Logger>(SERVICES.LOGGER))
      : console.error;
    errorLogger({ msg: 'failed to initialize the cli', err: error });
  })
  .finally(() => {
    // TODO: improve exit code logic
    const exitCode = container.isRegistered(EXIT_CODE) ? container.resolve<number>(EXIT_CODE) : ExitCodes.GENERAL_ERROR;
    process.exit(exitCode);
  });
