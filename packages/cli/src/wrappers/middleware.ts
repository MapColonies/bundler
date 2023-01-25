import { GithubClient } from '@bundler/github';
import { Logger } from 'pino';
import pino from 'pino';
import { DependencyContainer } from 'tsyringe';
import { Arguments, MiddlewareFunction } from 'yargs';
import { GlobalArguments } from '../cliBuilderFactory';
import { SERVICES } from '../common/constants';
import { registerDependencies } from '../common/dependencyRegistration';
import { IConfig } from '../config/configStore';
import { LogTarget, VERBOSE_LOG_LEVEL } from '../common/logger';

type RegisterOnContainerMiddlewareFactory<T> = (container: DependencyContainer) => MiddlewareFunction<T>;

export const githubRegistrationMiddlewareFactory: RegisterOnContainerMiddlewareFactory<GlobalArguments> = (dependencyContainer) => {
  const middleware = (args: Arguments<GlobalArguments>): void => {
    let { token } = args;

    const configStore = dependencyContainer.resolve<IConfig>(SERVICES.CONFIG);

    if (token === undefined && configStore.has('githubAccessToken')) {
      token = configStore.get<string>('githubAccessToken');
    }

    const logger = dependencyContainer.resolve<Logger>(SERVICES.LOGGER);

    const client = new GithubClient({ auth: token, logger });

    registerDependencies([
      {
        token: SERVICES.GITHUB_CLIENT,
        provider: { useValue: client },
      },
    ]);
  };

  return middleware;
};

export const verboseLoggerRegistrationMiddlewareFactory: RegisterOnContainerMiddlewareFactory<GlobalArguments> = (dependencyContainer) => {
  const middleware = (args: Arguments<GlobalArguments>): void => {
    const { verbose } = args;

    if (!verbose) {
      return;
    }

    const configStore = dependencyContainer.resolve<IConfig>(SERVICES.CONFIG);

    const logger = pino({
      level: VERBOSE_LOG_LEVEL,
      transport: {
        targets: [
          {
            target: LogTarget.FILE,
            options: { destination: configStore.get<string>('logPath'), mkdir: true, append: true },
            level: VERBOSE_LOG_LEVEL,
          },
          { target: LogTarget.TERMINAL, options: { destination: 1 }, level: VERBOSE_LOG_LEVEL },
        ],
      },
    });

    registerDependencies([
      {
        token: SERVICES.LOGGER,
        provider: { useValue: logger },
      },
    ]);
  };

  return middleware;
};
