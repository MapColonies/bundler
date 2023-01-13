import { EOL } from 'os';
import chalk, { ChalkFunction } from 'chalk';
import columnify, { GlobalOptions as ColumnifyOptions } from 'columnify';
import { dots as spinner } from 'cli-spinners';

let i = 0;

const PADDING = ' ';

enum Status {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILURE = 'FAILURE',
}

interface Statused {
  status: Status;
  content?: string;
}

interface Styled {
  isBold?: boolean;
  isDim?: boolean;
  level?: number;
  status?: Status;
}

interface StringedContent extends Styled {
  status: Status;
  content?: string;
  subContent?: Content;
}

interface ColumnedContent<T extends Statused> extends Styled {
  status: Status;
  content: { config: ExtendedColumnifyOptions; data: T[] };
  subContent?: Content;
}

const statusToChalkMap: Record<Status, ChalkFunction> = {
  [Status.SUCCESS]: chalk.inverse.green,
  [Status.PENDING]: chalk.inverse.cyan,
  [Status.FAILURE]: chalk.inverse.red,
};

const statusToMarkMap = (status: Status): string => {
  switch (status) {
    case Status.SUCCESS:
      return chalk.green('✔');
    case Status.PENDING:
      return chalk.cyan(spinner.frames[++i % spinner.frames.length]);
    case Status.FAILURE:
      return chalk.red('✘');
  }
};
const indent = (content: string, amount = 0): string => {
  const indentation = PADDING.repeat(Math.max(0, amount));
  return content
    .split(EOL)
    .map((line) => `${indentation}${line}`)
    .join(EOL);
};

interface StyleResult {
  prefix?: string;
  main?: string;
  suffix?: string;
}

const styleResultToString = (result: StyleResult): string => {
  const { prefix, main, suffix } = result;
  return `${prefix !== undefined ? `${EOL}${prefix}${EOL}` : ''}${main ?? ''}${suffix !== undefined ? `${EOL}${suffix}` : ''}`;
};

function* styleContent(current?: Content): Generator<string> {
  if (current === undefined) {
    return;
  }

  const { content, status, level, isBold, isDim } = current;

  let strigifiedContent = '';

  if (typeof content === 'undefined') {
    strigifiedContent = `${statusToMarkMap(status)}`;
  } else if (typeof content === 'string') {
    strigifiedContent = content;
  } else {
    const { config, data } = content;
    data.forEach((d) => {
      d.content = statusToMarkMap(d.status);
    });
    const { alternateChalks } = config;

    strigifiedContent = columnify(data, config);
    if (alternateChalks) {
      strigifiedContent = strigifiedContent
        .split(EOL)
        .map((line, index) => alternateChalks[index % alternateChalks.length](line))
        .join(EOL);
    }
  }

  if (isBold === true) {
    strigifiedContent = chalk.bold(strigifiedContent);
  }

  if (isDim === true) {
    strigifiedContent = chalk.dim(strigifiedContent);
  }

  yield `${EOL}${indent(strigifiedContent, level)}`;

  yield* styleContent(current.subContent);
}

export interface Title extends Styled {
  content: string;
}

export type Content = ColumnedContent<Statused> | StringedContent;

export interface ExtendedColumnifyOptions extends ColumnifyOptions {
  preserveNewLines: true;
  alternateChalks?: ChalkFunction[];
}

export interface StyleRequest {
  prefix?: Title;
  main?: Content[];
  suffix?: Title;
}

export const styleFunc = (request: StyleRequest): string => {
  const { prefix, suffix, main } = request;

  const result: { prefix?: string; suffix?: string; main?: string } = { main: '' };

  [prefix, suffix].forEach((title) => {
    if (title) {
      const { level, isBold, status, isDim } = title;
      let { content } = title;

      if (status) {
        content = statusToChalkMap[status](content);
      }

      if (isBold === true) {
        content = chalk.bold(content);
      }

      if (isDim === true) {
        content = chalk.dim(content);
      }

      content = indent(content, level);

      if (title === prefix) {
        result.prefix = content;
      } else {
        result.suffix = content;
      }
    }
  });

  for (const content of main ?? []) {
    for (const styledContent of styleContent(content)) {
      result.main += styledContent;
    }
    result.main += EOL;
  }

  return styleResultToString(result);
};
