export { ILogger, LogFn, IParentLogger } from './logging';

export const GITHUB_ORG = 'MapColonies';

export const NOT_FOUND_INDEX = -1;

/* eslint-disable @typescript-eslint/naming-convention */
export const ExitCodes = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
};
/* eslint-enable @typescript-eslint/naming-convention */

export enum Status {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILURE = 'FAILURE',
}

export interface Statused {
  status: Status;
  content?: string;
}

export interface Identifiable {
  id: string;
}

export interface VerifyEntity {
  name: string;
  verification: Promise<void>;
  result: {
    status: Status;
    content?: string;
    reason?: Error;
  };
}
