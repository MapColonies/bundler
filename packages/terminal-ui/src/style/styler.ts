import { EOL } from 'os';
import chalk from 'chalk';
import columnify from 'columnify';
import { dots as spinner } from 'cli-spinners';
import { EMPTY_LINE, indent, statusToChalkMap, statusToMarkMap } from './util';
import { Content, StyleRequest } from './styleRequest';

let spinnerFrameIndex = 0;

interface StyleResult {
  prefix?: string;
  main?: string;
  suffix?: string;
}

const strigifyResult = (result: StyleResult): string => {
  const { prefix, main, suffix } = result;
  return `${prefix !== undefined ? `${EOL}${prefix}${EOL}` : EMPTY_LINE}${main ?? EMPTY_LINE}${
    suffix !== undefined ? `${EOL}${suffix}` : EMPTY_LINE
  }`;
};

function* styleContent(current?: Content): Generator<string> {
  if (current === undefined) {
    return;
  }

  const { content, status, level, isBold, isDim } = current;

  let strigifiedContent = EMPTY_LINE;

  if (typeof content === 'undefined') {
    strigifiedContent = `${statusToMarkMap(status)}`;
  } else if (typeof content === 'string') {
    strigifiedContent = content;
  } else {
    const { config, data } = content;

    for (const d of data) {
      d.content = statusToMarkMap(d.status);
    }

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

export const getSpinnerFrame = (): string => {
  return spinner.frames[spinnerFrameIndex % spinner.frames.length];
};

export const style = (request: StyleRequest): string => {
  const { prefix, suffix, main } = request;

  const result: { prefix?: string; suffix?: string; main?: string } = { main: EMPTY_LINE };

  for (const title of [prefix, suffix]) {
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
  }

  spinnerFrameIndex++;

  for (const content of main ?? []) {
    for (const styledContent of styleContent(content)) {
      result.main += styledContent;
    }
    result.main += EOL;
  }

  return strigifyResult(result);
};
