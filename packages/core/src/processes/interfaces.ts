export interface Identifiable {
  id: string;
}

export interface Image extends Identifiable {
  name: string;
  tag: string;
}

export interface HelmPackage extends Identifiable {}

export interface DownloadObject extends Identifiable {}

export interface EnvOptions {
  useBuildkit?: boolean;
}

export interface DockerBuildArgs {
  dockerFile: string;
  image: Image;
  path: string;
}

export interface DockerPullArgs {
  registry?: string;
  image: Image;
}

export interface DockerSaveArgs {
  image: Image;
  path: string;
  registry?: string;
}

export interface HelmPackageArgs {
  packageId: string;
  path: string;
  destination: string;
}

export interface DownloadArgs {
  id: string;
  url: string;
  destination: string;
}
