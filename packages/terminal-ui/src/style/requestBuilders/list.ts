import chalk from 'chalk';
import { Status } from '@map-colonies/bundler-common';
import { Level } from '../util';
import { ExtendedColumnifyOptions, StyleRequest } from '../styleRequest';
import { PREFIX, StyleRequestBuilder } from '.';

const COMMAND_NAME = 'list';

interface Listed {
  name: string;
  language?: string | null;
  topics?: string[];
  status: Status;
}

const columnifyOptions: ExtendedColumnifyOptions = {
  align: 'left',
  preserveNewLines: true,
  columns: ['name', 'language', 'topics'],
  showHeaders: true,
  alternateChalks: [chalk.bold.hex('#a5d4d3'), chalk.cyanBright],
};

export class ListStyleRequestBuilder extends StyleRequestBuilder {
  public build(data: { list: Listed[]; status: Status }): StyleRequest {
    const status = data.status;
    const prefix = { content: PREFIX(COMMAND_NAME), isBold: true, status };
    const spinner = { level: Level.FIRST, status };

    if (status === Status.PENDING && data.list.length === 0) {
      return { prefix, main: [spinner] };
    }

    const columns = { level: Level.FIRST, status, content: { config: columnifyOptions, data: data.list } };
    const main = status === Status.SUCCESS ? [columns] : [columns, spinner];
    const suffix = { level: Level.FIRST, status, isBold: true, content: ` listed ${data.list.length} repositories ` };
    return { prefix: { content: PREFIX(COMMAND_NAME), isBold: true, status }, main, suffix };
  }
}
