import { Identifiable, ILogger } from '@bundler/common';
import { spawnChild } from '../../spawner/spawner';
import { GlobalOptions } from '../common';

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

export const helmPackage = async (args: HelmPackageArgs & GlobalOptions): Promise<void> => {
  const { path, destination, verbose, logger } = args;

  let childLogger: ILogger | undefined = undefined;
  if (verbose === true) {
    childLogger = logger?.child({ helmPackage: args.helmPackage }, { level: 'debug' });
  }

  const childProcess = spawnChild(HELM_EXEC, Command.PACKAGE, [path, '-d', destination], undefined, childLogger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `helm ${Command.PACKAGE} failed with exit code ${exitCode}`);
  }
};

export const helmVersion = async (args?: GlobalOptions): Promise<void> => {
  const { logger, verbose } = args ?? {};

  let childLogger: ILogger | undefined = undefined;
  if (verbose === true) {
    childLogger = logger?.child({}, { level: 'debug' });
  }

  const childProcess = spawnChild(HELM_EXEC, Command.VERSION, [], undefined, childLogger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.VERSION} failed with exit code ${exitCode}`);
  }
};
