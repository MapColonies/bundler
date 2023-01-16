import { Status, VerifyEntity } from '@bundler/common';
import { ExtendedColumnifyOptions, StyleRequest } from '../styler';
import { StyleRequestBuilder, PREFIX } from '.';

const COMMAND_NAME = 'verify';

const columnifyOptions: ExtendedColumnifyOptions = {
  align: 'left',
  preserveNewLines: true,
  columns: ['content', 'name', 'reason'],
  showHeaders: false,
  columnSplitter: '   ',
  config: { content: { align: 'center' }, reason: { maxWidth: 80 } },
};

export const VERIFIED_MESSAGE = ' ready to bundle! 📦 ';
export const NOT_VERIFIED_MESSAGE = ' something is wrong 🥺 ';

export class VerifyStyleRequestBuilder extends StyleRequestBuilder {
  public build(data: VerifyEntity[]): StyleRequest {
    let overallStatus = data.every((entity) => entity.result.status === Status.SUCCESS) ? Status.SUCCESS : Status.PENDING;
    overallStatus = data.some((entity) => entity.result.status === Status.FAILURE) ? Status.FAILURE : overallStatus;

    const main = [
      {
        level: 3,
        status: overallStatus,
        content: { data: data.map((entity) => ({ ...entity.result, name: entity.name })), config: columnifyOptions },
      },
    ];
    const message = overallStatus === Status.SUCCESS ? VERIFIED_MESSAGE : NOT_VERIFIED_MESSAGE;
    return {
      prefix: { content: PREFIX(COMMAND_NAME), isBold: true, status: overallStatus },
      suffix: overallStatus !== Status.PENDING ? { content: message, level: 3, isBold: true, status: overallStatus } : undefined,
      main,
    };
  }
}
