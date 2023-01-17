import { join } from 'path';
import { rm } from 'fs/promises';
import pino from 'pino';
import { ExitCodes } from '@bundler/common';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import { SERVICES, CLI_BUILDER, EXIT_CODE, BASE_LOGGER_OPTIONS, ON_SIGNAL } from './common/constants';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { cliBuilderFactory } from './cliBuilderFactory';
import { bundleCommandFactory } from './commands/bundle/bundleFactory';
import { BUNDLE_COMMAND_FACTORY } from './commands/bundle/constants';
import { LIST_COMMAND_FACTORY } from './commands/list/constants';
import { listCommandFactory } from './commands/list/listFactory';
import { VERIFY_COMMAND_FACTORY } from './commands/verify/constants';
import { verifyCommandFactory } from './commands/verify/verifyFactory';
import { loadLocalConfig, LOGS_DIR } from './config/local';
import { ConfigStore } from './config/configStore';

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  const localConfig = await loadLocalConfig();

  const configStore = new ConfigStore();

  configStore.set('workdir', localConfig.workdir);
  if (localConfig.githubAccessToken !== undefined) {
    configStore.set('githubAccessToken', localConfig.githubAccessToken);
  }

  const logPath = join(LOGS_DIR, `${new Date().toISOString()}.log`);
  configStore.set('logPath', logPath);

  const logger = pino({
    ...BASE_LOGGER_OPTIONS,
    level: 'info',
    transport: { target: 'pino/file', options: { destination: logPath, append: false, mkdir: true }, level: 'info' },
  });

  const cleanupRegistry = new CleanupRegistry();
  cleanupRegistry.register({ func: async () => rm(logPath), id: 'logPath' });

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.CONFIG, provider: { useValue: configStore } },
    { token: CLI_BUILDER, provider: { useFactory: cliBuilderFactory } },
    { token: BUNDLE_COMMAND_FACTORY, provider: { useFactory: bundleCommandFactory } },
    { token: LIST_COMMAND_FACTORY, provider: { useFactory: listCommandFactory } },
    { token: VERIFY_COMMAND_FACTORY, provider: { useFactory: verifyCommandFactory } },
    { token: EXIT_CODE, provider: { useValue: ExitCodes.SUCCESS } },
    {
      token: ON_SIGNAL,
      provider: {
        useValue: cleanupRegistry.trigger.bind(cleanupRegistry),
      },
    },
  ];

  return registerDependencies(dependencies, options?.override, options?.useChild);
};
