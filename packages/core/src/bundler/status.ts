// TODO: common
interface Statused {
  status: Status;
  content?: string;
}

// TODO: common
export enum Status {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILURE = 'FAILURE',
}

export interface EntityStatus extends Statused {
  name: string;
}

export interface RepositoryStatus extends Statused {
  name: string;
  images?: EntityStatus[];
  packages?: EntityStatus[];
  assets?: EntityStatus[];
}

export interface BundleStatus extends Statused {
  repositories: RepositoryStatus[];
}
