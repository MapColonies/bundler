/* eslint-disable @typescript-eslint/no-magic-numbers */
import { EOL } from 'os';
import * as readline from 'readline';
import { ExitCodes } from '../common/constants';

const RENDER_INTERVAL = 100;

const clearStream = (stream: NodeJS.WriteStream, numberOfLines: number): void => {
  for (let index = 0; index < numberOfLines; index++) {
    readline.moveCursor(stream, 0, -1);
    readline.clearLine(stream, 1);
  }
};

const writeToStream = (stream: NodeJS.WriteStream, lines: string[]): void => {
  for (const line of lines) {
    if (line === '') {
      stream.write(' ' + EOL);
    } else {
      stream.write(line + EOL);
    }
  }
};

export const createTerminalStreamer = (stream: NodeJS.WriteStream, scrapeFunc: () => string, interval = RENDER_INTERVAL): void => {
  let renderIntervalId: NodeJS.Timeout | undefined;
  let lastNumOfLines = 0;

  const render = (): void => {
    clearStream(stream, lastNumOfLines);
    const scraped = scrapeFunc();
    const lines = scraped.split(EOL);
    lastNumOfLines = lines.length;
    writeToStream(stream, lines);
  };

  const clearRenderInterval = (): void => {
    if (renderIntervalId) {
      clearInterval(renderIntervalId);
    }
  };

  process.on('exit', (code: number) => {
    if (code === ExitCodes.SUCCESS) {
      render();
    }
    clearRenderInterval();
  });

  process.on('SIGINT', () => clearRenderInterval());
  process.on('SIGTERM', () => clearRenderInterval());
  process.on('SIGHUP', () => clearRenderInterval());

  if (!renderIntervalId) {
    renderIntervalId = setInterval(render, interval);
  }
};
