/* eslint-disable @typescript-eslint/naming-convention */
export const ExitCodes = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
};

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
