/* eslint-disable @typescript-eslint/naming-convention */
import { readPackageJsonSync } from '@map-colonies/read-pkg';

export const CLI_NAME = readPackageJsonSync('../package.json').name ?? 'unknown_cli';

export const CLI_BUILDER = Symbol('cliBuilder');
export const EXIT_CODE = Symbol('exitCode');

export const SERVICES: Record<string, symbol> = {
  LOGGER: Symbol('Logger'),
  CONFIG: Symbol('Config'),
};

export const ExitCodes = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
};
