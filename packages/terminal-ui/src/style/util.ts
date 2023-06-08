import { EOL } from 'os';
import { Status } from '@map-colonies/bundler-common';
import chalk, { ChalkFunction } from 'chalk';
import { getSpinnerFrame } from './styler';

export const PADDING = ' ';
export const EMPTY_LINE = '';

/* eslint-disable @typescript-eslint/no-magic-numbers */
export enum Level {
  FIRST = 3,
  SECOND = 6,
  THIRD = 9,
} /* eslint-enable @typescript-eslint/no-magic-numbers */

export const statusToChalkMap: Record<Status, ChalkFunction> = {
  [Status.SUCCESS]: chalk.inverse.green,
  [Status.PENDING]: chalk.inverse.cyan,
  [Status.WARNING]: chalk.inverse.yellow,
  [Status.FAILURE]: chalk.inverse.red,
};

export const statusToMarkMap = (status: Status): string => {
  switch (status) {
    case Status.SUCCESS:
      return chalk.green('✔');
    case Status.PENDING:
      return chalk.cyan(getSpinnerFrame());
    case Status.WARNING:
      return chalk.yellow('⚠');
    case Status.FAILURE:
      return chalk.red('✘');
  }
};

export const indent = (content: string, amount = 0): string => {
  const indentation = PADDING.repeat(Math.max(0, amount));
  return content
    .split(EOL)
    .map((line) => `${indentation}${line}`)
    .join(EOL);
};
