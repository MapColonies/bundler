import { GithubClient } from '@bundler/github';
import { Logger } from '@map-colonies/js-logger';
import pino from 'pino';
import { DependencyContainer } from 'tsyringe';
import { Arguments, MiddlewareFunction } from 'yargs';
import { GlobalArguments } from '../cliBuilderFactory';
import { SERVICES } from '../common/constants';
import { registerDependencies } from '../common/dependencyRegistration';

type RegisterOnContainerMiddlewareFactory<T> = (container: DependencyContainer) => MiddlewareFunction<T>;

export const githubRegistrationMiddlewareFactory: RegisterOnContainerMiddlewareFactory<GlobalArguments> = (dependencyContainer) => {
  const middleware = (args: Arguments<GlobalArguments>): void => {
    const { token } = args;

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

    const level = verbose ? 'debug' : 'info';

    const logger = pino({
      level,
      transport: {
        targets: [
          { target: 'pino/file', options: { destination: '/tmp/temp/log/pino-log', append: false, mkdir: true }, level },
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
