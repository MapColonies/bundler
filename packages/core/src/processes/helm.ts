import { CommanderOptions } from './commander';
import { HelmPackageArgs } from './interfaces';
import { spawnChild } from './childProcess';

enum Command {
  PACKAGE = 'package',
  VERSION = 'version',
}

export const HELM_EXEC = 'helm';

export const helmPackage = async (args: HelmPackageArgs & CommanderOptions): Promise<void> => {
  const { path, destination, verbose, logger } = args;

  const childProcess = spawnChild(HELM_EXEC, Command.PACKAGE, [path, '-d', destination], undefined, verbose === true ? logger : undefined);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `helm ${Command.PACKAGE} failed with exit code ${exitCode}`);
  }
};

export const helmVersion = async (args?: CommanderOptions & CommanderOptions): Promise<void> => {
  const { logger, verbose } = args ?? {};

  const childProcess = spawnChild(HELM_EXEC, Command.VERSION, [], undefined, verbose === true ? logger : undefined);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.VERSION} failed with exit code ${exitCode}`);
  }
};
