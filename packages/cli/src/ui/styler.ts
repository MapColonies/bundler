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
  level?: number;
  status?: Status;
}

interface StringedContent extends Styled {
  status: Status
  content?: string;
  subContent?: Content;
}

interface ColumnedContent<T extends Statused> extends Styled {
  status: Status
  content: { config: ExtendedColumnifyOptions; data: T[] };
  subContent?: Content;
}

interface Title extends Styled {
  isBold?: boolean;
  content: string;
}

const statusToChalkMap: Record<Status, ChalkFunction> = {
  [Status.SUCCESS]: chalk.bgGreen,
  [Status.PENDING]: chalk.bgCyan,
  [Status.FAILURE]: chalk.bgRed,
};

const statusToFigureMap = (status: Status): string => {
  switch (status) {
    case Status.SUCCESS:
      return chalk.green('✔');
    case Status.PENDING:
      return chalk.cyan(spinner.frames[++i % spinner.frames.length]);
    case Status.FAILURE:
      return chalk.red('✘');
  }
}
const indent = (content: string, amount = 0): string => {
  const indentation = PADDING.repeat(Math.max(0, amount));
  return content
    .split(EOL)
    .map((line) => `${indentation}${line}`)
    .join(EOL);
};

interface StyleResult {
  prefix?: string;
  suffix?: string;
  main?: string;
}

const styleResultToString = (result: StyleResult): string => {
  const { prefix, main, suffix } = result;
  return `${prefix !== undefined ? `${EOL}${prefix}${EOL}${EOL}` : ''}${main ?? ''}${suffix !== undefined ? `${EOL}${EOL}${suffix}` : ''}`;
};

function* styleContent(current?: Content): Generator<string> {
  if (current === undefined) {
    return;
  }

  const { content, status, level } = current;

  if (typeof content === 'undefined') {
    yield `${EOL}${indent(statusToFigureMap(status), level)}`
  } else if (typeof content === 'string') {
    yield `${EOL}${indent(content, level)}`;
  } else {
    const { config, data } = content;
    data
      .forEach((d) => {
        d.content = statusToFigureMap(d.status);
      });
    const { alternateChalks } = config;

    // TODO: improve
    const temp = indent(columnify(data, config), level);
    if (alternateChalks) {
      yield temp
        .split(EOL)
        .map((line, index) => alternateChalks[index % alternateChalks.length](line))
        .join(EOL);
    } else {
      yield `${EOL}${temp}`;
    }
  }

  yield* styleContent(current.subContent);
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

  const result: { prefix?: string; suffix?: string; main?: string } = {};

  [prefix, suffix].forEach((title) => {
    if (title) {
      const { level, isBold, status } = title;
      let { content } = title;

      if (status) {
        content = statusToChalkMap[status](content);
      }

      if (isBold === true) {
        content = chalk.bold(content);
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
