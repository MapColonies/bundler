/* eslint-disable @typescript-eslint/naming-convention */
import { readPackageJsonSync } from '@map-colonies/read-pkg';

export const CLI_NAME = readPackageJsonSync('../package.json').name ?? 'unknown_cli';

export const TERMINAL_STREAM = process.stderr;

export const CLI_BUILDER = Symbol('cliBuilder');
export const ON_SIGNAL = Symbol('onSignal');

export const SERVICES: Record<string, symbol> = {
  CONFIG: Symbol('Config'),
  LOGGER: Symbol('Logger'),
  GITHUB_CLIENT: Symbol('GithubClient'),
};
