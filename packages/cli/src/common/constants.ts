/* eslint-disable @typescript-eslint/naming-convention */
export const TERMINAL_STREAM = process.stderr;

export const CLI_BUILDER = Symbol('cliBuilder');
export const ON_SIGNAL = Symbol('onSignal');

export const SERVICES: Record<string, symbol> = {
  CONFIG: Symbol('Config'),
  LOGGER: Symbol('Logger'),
  GITHUB_CLIENT: Symbol('GithubClient'),
};
