import { Status, VerifyEntity } from '@map-colonies/bundler-common';
import { Level, PADDING } from '../util';
import { ExtendedColumnifyOptions, StyleRequest } from '../styleRequest';
import { StyleRequestBuilder, PREFIX } from '.';

const COMMAND_NAME = 'verify';

const columnifyOptions: ExtendedColumnifyOptions = {
  align: 'left',
  preserveNewLines: true,
  columns: ['content', 'name', 'reason'],
  showHeaders: false,
  columnSplitter: PADDING.repeat(Level.FIRST),
  config: { content: { align: 'center' }, reason: { maxWidth: 80 } },
};

export const VERIFIED_MESSAGE = `${PADDING}ready to bundle! 📦${PADDING}`;
export const NOT_VERIFIED_MESSAGE = `${PADDING}something is wrong 🥺${PADDING}`;

export class VerifyStyleRequestBuilder extends StyleRequestBuilder {
  public build(data: VerifyEntity[]): StyleRequest {
    let overallStatus = data.every((entity) => entity.result.status === Status.SUCCESS) ? Status.SUCCESS : Status.PENDING;
    overallStatus = data.some((entity) => entity.result.status === Status.FAILURE) ? Status.FAILURE : overallStatus;

    const main = [
      {
        level: Level.FIRST,
        status: overallStatus,
        content: { data: data.map((entity) => ({ ...entity.result, name: entity.name })), config: columnifyOptions },
      },
    ];
    const message = overallStatus === Status.SUCCESS ? VERIFIED_MESSAGE : NOT_VERIFIED_MESSAGE;
    return {
      prefix: { content: PREFIX(COMMAND_NAME), isBold: true, status: overallStatus },
      suffix: overallStatus !== Status.PENDING ? { content: message, level: Level.FIRST, isBold: true, status: overallStatus } : undefined,
      main,
    };
  }
}
