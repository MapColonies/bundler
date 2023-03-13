import { Identifiable, ILogger } from '@bundler/common';
import { spawnChild } from '../../spawner/spawner';

const HELM_EXEC = 'helm';

enum Command {
  PACKAGE = 'package',
  VERSION = 'version',
}

export interface HelmPackage extends Identifiable {}

export interface HelmPackageArgs {
  helmPackage: HelmPackage;
  path: string;
  destination: string;
}

export const helmPackage = async (args: HelmPackageArgs & { logger?: ILogger }): Promise<void> => {
  const { path, destination, logger } = args;

  const childProcess = spawnChild(HELM_EXEC, Command.PACKAGE, [path, '-d', destination], undefined, logger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `helm ${Command.PACKAGE} failed with exit code ${exitCode}`);
  }
};

export const helmVersion = async (args?: { logger?: ILogger }): Promise<void> => {
  const childProcess = spawnChild(HELM_EXEC, Command.VERSION, [], undefined, args?.logger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.VERSION} failed with exit code ${exitCode}`);
  }
};
