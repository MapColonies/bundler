import { ExitCodes } from '@bundler/common';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import jsLogger from '@map-colonies/js-logger';
import { SERVICES, CLI_BUILDER, EXIT_CODE } from './common/constants';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { cliBuilderFactory } from './cliBuilderFactory';
import { bundleCommandFactory } from './commands/bundle/bundleFactory';
import { BUNDLE_COMMAND_FACTORY } from './commands/bundle/constants';
import { LIST_COMMAND_FACTORY } from './commands/list/constants';
import { listCommandFactory } from './commands/list/listFactory';
import { VERIFY_COMMAND_FACTORY } from './commands/verify/constants';
import { verifyCommandFactory } from './commands/verify/verifyFactory';

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = (options?: RegisterOptions): DependencyContainer => {
  const logger = jsLogger({ level: 'debug', prettyPrint: true });

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: CLI_BUILDER, provider: { useFactory: cliBuilderFactory } },
    { token: BUNDLE_COMMAND_FACTORY, provider: { useFactory: bundleCommandFactory } },
    { token: LIST_COMMAND_FACTORY, provider: { useFactory: listCommandFactory } },
    { token: VERIFY_COMMAND_FACTORY, provider: { useFactory: verifyCommandFactory } },
    { token: EXIT_CODE, provider: { useValue: ExitCodes.SUCCESS } },
  ];

  return registerDependencies(dependencies, options?.override, options?.useChild);
};
