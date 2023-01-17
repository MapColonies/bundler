import { GithubClient } from '@bundler/github';
import { Logger } from 'pino';
import pino from 'pino';
import { DependencyContainer } from 'tsyringe';
import { Arguments, MiddlewareFunction } from 'yargs';
import { GlobalArguments } from '../cliBuilderFactory';
import { SERVICES } from '../common/constants';
import { registerDependencies } from '../common/dependencyRegistration';
import { IConfig } from '../config/configStore';

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

export const loggerRegistrationMiddlewareFactory: RegisterOnContainerMiddlewareFactory<GlobalArguments> = (dependencyContainer) => {
  const middleware = (args: Arguments<GlobalArguments>): void => {
    const { verbose } = args;

    if (!verbose) {
      return;
    }

    const configStore = dependencyContainer.resolve<IConfig>(SERVICES.CONFIG);

    // TODO: log level formatter
    const level = 'debug';
    const logger = pino({
      level,
      transport: {
        targets: [
          { target: 'pino/file', options: { destination: configStore.get<string>('logPath'), append: true, mkdir: true }, level },
          { target: 'pino-pretty', options: { destination: 1 }, level },
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
