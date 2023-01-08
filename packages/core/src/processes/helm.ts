import { CommanderOptions } from './commander';
import { HelmPackageArgs } from './interfaces';
import { promisifyChildProcess, spawnChildProcess } from '.';

enum Command {
  PACKAGE = 'package',
  VERSION = 'version',
}

export const HELM_EXEC = 'helm';

export const helmPackage = async (args: HelmPackageArgs & CommanderOptions): Promise<void> => {
  const { path, destination } = args;

  const childProcess = spawnChildProcess(HELM_EXEC, Command.PACKAGE, [path, '-d', destination], undefined, args.verbose, args.logger);

  const { exitCode, stderr } = await promisifyChildProcess(childProcess);

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `helm ${Command.PACKAGE} failed with exit code ${exitCode ?? 'null'}`);
  }
};

export const helmVersion = async (args?: CommanderOptions): Promise<void> => {
  const childProcess = spawnChildProcess(HELM_EXEC, Command.VERSION, [], undefined, args?.verbose, args?.logger);

  const { exitCode, stderr } = await promisifyChildProcess(childProcess);

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.VERSION} failed with exit code ${exitCode ?? 'null'}`);
  }
};
