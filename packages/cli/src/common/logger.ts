import { LoggerOptions } from 'pino';

export const LOG_FILE_EXTENSION = 'log';

export enum LogTarget {
  FILE = 'pino/file',
  TERMINAL = 'pino-pretty',
}

export const DEFAULT_LOG_LEVEL = 'info';
export const VERBOSE_LOG_LEVEL = 'debug';

export const BASE_LOGGER_OPTIONS: LoggerOptions = {
  formatters: {
    level: (label) => ({ level: label }),
  },
};
