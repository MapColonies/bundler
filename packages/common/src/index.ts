export { ILogger, LogFn, IParentLogger } from './logging';

export const GITHUB_ORG = 'MapColonies';
export const DEFAULT_CONTAINER_REGISTRY = 'acrarolibotnonprod.azurecr.io';

export const NOT_FOUND_INDEX = -1;
export const TAR_FORMAT = 'tar';
export const TAR_GZIP_ARCHIVE_FORMAT = 'tar.gz';
export const CHECKSUM_FILE = 'checksum.yaml';

/* eslint-disable @typescript-eslint/naming-convention */
export const ExitCodes = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
};
/* eslint-enable @typescript-eslint/naming-convention */

export enum Status {
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
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
  erroredStatus: Status;
  result: {
    status: Status;
    content?: string;
    reason?: Error;
  };
}
