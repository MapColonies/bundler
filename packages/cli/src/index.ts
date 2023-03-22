#!/usr/bin/env node
/* eslint-disable import/first */
// this import must be called before the first import of tsyring
import 'reflect-metadata';
import { hideBin } from 'yargs/helpers';
import { Logger } from 'pino';
import { DependencyContainer } from 'tsyringe';
import { ExitCodes } from '@map-colonies/bundler-common';
import { ON_SIGNAL, SERVICES } from './common/constants';
import { getCli } from './cli';

let depContainer: DependencyContainer | undefined;

const shutDownFn = async (): Promise<void> => {
  if (depContainer?.isRegistered(ON_SIGNAL) === true) {
    const onSignalFn: () => Promise<void> = depContainer.resolve(ON_SIGNAL);
    return onSignalFn();
  }
};

void getCli()
  .then(async ([container, cli]) => {
    depContainer = container;
    await cli.parseAsync(hideBin(process.argv));

    await shutDownFn();
  })
  .catch(async (error: Error) => {
    process.exitCode = ExitCodes.GENERAL_ERROR;

    const errorLogger =
      depContainer?.isRegistered(SERVICES.LOGGER) === true
        ? depContainer.resolve<Logger>(SERVICES.LOGGER).error.bind(depContainer.resolve<Logger>(SERVICES.LOGGER))
        : console.error;

    errorLogger({ msg: 'failed to initialize the cli', err: error });

    await shutDownFn();
  })
  .finally(() => {
    process.exit();
  });
