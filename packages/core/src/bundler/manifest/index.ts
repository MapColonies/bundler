import { BundleDirs } from '../constants';
import { BaseOutput } from '../interfaces';

interface RepositoryParameters {
  id: string;
  buildImageLocally?: boolean;
  includeMigrations?: boolean;
  includeAssets?: boolean;
  includeHelmPackage?: boolean;
}

type OptionalBundleDirs = {
  [key in BundleDirs]?: string[];
};

export interface BundleOutputTree {
  [repositoryId: string]: (OptionalBundleDirs | string)[];
}

export interface Manifest extends BaseOutput {
  output: BundleOutputTree;
  parameters: { repositories: RepositoryParameters[] };
}
