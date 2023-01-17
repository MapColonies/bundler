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

export interface VerifyEntity {
  name: string;
  verification: Promise<void>;
  result: {
    status: Status;
    content?: string;
    reason?: Error;
  };
}
