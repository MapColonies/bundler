import { EOL } from 'os';
import * as readline from 'readline';
import { EMPTY_LINE, PADDING } from '../style/util';

const UP = -1;
const LEFT = 0;
const RIGTH = 1;

const clearStream = (stream: NodeJS.WriteStream, numberOfLines: number): void => {
  for (let index = 0; index < numberOfLines; index++) {
    readline.moveCursor(stream, LEFT, UP);
    readline.clearLine(stream, RIGTH);
  }
};

const writeStream = (stream: NodeJS.WriteStream, lines: string[]): void => {
  for (const line of lines) {
    if (line === EMPTY_LINE) {
      stream.write(PADDING + EOL);
    } else {
      stream.write(line + EOL);
    }
  }
};

export type StreamFunc = (content: string) => void;

export const createTerminalStreamer = (stream: NodeJS.WriteStream): StreamFunc => {
  let lastNumOfLines = 0;

  return (content: string): void => {
    clearStream(stream, lastNumOfLines);
    const lines = content.split(EOL);
    lastNumOfLines = lines.length;
    writeStream(stream, lines);
  };
};
