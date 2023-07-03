import { join } from 'path';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import pino from 'pino';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { ExitCodes } from '@map-colonies/bundler-common';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import { SERVICES, CLI_BUILDER, ON_SIGNAL } from './common/constants';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { cliBuilderFactory } from './cliBuilderFactory';
import { bundleCommandFactory } from './commands/bundle/bundleFactory';
import { BUNDLE_COMMAND_FACTORY } from './commands/bundle/constants';
import { LIST_COMMAND_FACTORY } from './commands/list/constants';
import { listCommandFactory } from './commands/list/listFactory';
import { VERIFY_COMMAND_FACTORY } from './commands/verify/constants';
import { verifyCommandFactory } from './commands/verify/verifyFactory';
import { DEFAULT_LOCAL_CONFIG, loadLocalConfig, LOGS_DIR } from './config/local';
import { ConfigStore } from './config/configStore';
import { BASE_LOGGER_OPTIONS, DEFAULT_LOG_LEVEL, LogTarget, LOG_FILE_EXTENSION } from './common/logger';

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

  const logPath = join(LOGS_DIR, `${new Date().toISOString()}.${LOG_FILE_EXTENSION}`);
  configStore.set('logPath', logPath);
  configStore.set('historyDir', localConfig.historyDir ?? DEFAULT_LOCAL_CONFIG.historyDir);

  const logger = pino({
    ...BASE_LOGGER_OPTIONS,
    level: DEFAULT_LOG_LEVEL,
    transport: { target: LogTarget.FILE, options: { destination: logPath, mkdir: true, append: false }, level: DEFAULT_LOG_LEVEL },
  });

  const cleanupRegistry = new CleanupRegistry();
  cleanupRegistry.register({
    id: 'logFileCleanup',
    func: async () => {
      if (process.exitCode === ExitCodes.SUCCESS && existsSync(logPath)) {
        return rm(logPath);
      }
    },
  });

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.CONFIG, provider: { useValue: configStore } },
    { token: CLI_BUILDER, provider: { useFactory: cliBuilderFactory } },
    { token: BUNDLE_COMMAND_FACTORY, provider: { useFactory: bundleCommandFactory } },
    { token: LIST_COMMAND_FACTORY, provider: { useFactory: listCommandFactory } },
    { token: VERIFY_COMMAND_FACTORY, provider: { useFactory: verifyCommandFactory } },
    {
      token: ON_SIGNAL,
      provider: {
        useValue: cleanupRegistry.trigger.bind(cleanupRegistry),
      },
    },
  ];

  return registerDependencies(dependencies, options?.override, options?.useChild);
};
