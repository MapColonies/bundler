export interface Image {
  id: string;
  name: string;
  tag: string;
}

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
