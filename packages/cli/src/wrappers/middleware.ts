import { GithubClient } from '@bundler/github';
import { Logger } from '@map-colonies/js-logger';
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
