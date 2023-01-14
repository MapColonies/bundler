import { BundleDirs } from '../constants';

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

export interface Manifest {
  id: string;
  destination: string;
  createdAt: string;
  output: BundleOutputTree;
  parameters: { repositories: RepositoryParameters[] };
}
