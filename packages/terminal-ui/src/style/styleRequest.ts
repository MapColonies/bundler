import { Status } from '@bundler/common';
import { GlobalOptions as ColumnifyOptions } from 'columnify';
import { ChalkFunction } from 'chalk';
import { Level } from './util';

interface Statused {
  status: Status;
  content?: string;
}

interface Styled {
  isBold?: boolean;
  isDim?: boolean;
  level?: Level;
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

export type Content = ColumnedContent<Statused> | StringedContent;

export interface ExtendedColumnifyOptions extends ColumnifyOptions {
  preserveNewLines: true;
  alternateChalks?: ChalkFunction[];
}

export interface Title extends Styled {
  content: string;
}

export interface StyleRequest {
  prefix?: Title;
  main?: Content[];
  suffix?: Title;
}
