export interface Identifiable {
  id: string;
}

export interface Image extends Identifiable {
  name: string;
  tag: string;
}

export interface HelmPackage extends Identifiable {}

export interface DownloadObject extends Identifiable {}

export interface EnvDictionary extends NodeJS.Dict<string> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  DOCKER_BUILDKIT?: string;
}

export interface EnvOptions {
  envOptions?: EnvDictionary;
}

export interface DockerBuildArgs extends EnvOptions {
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
  helmPackage: HelmPackage;
  path: string;
  destination: string;
}

export interface DownloadArgs {
  downloadObj: DownloadObject;
  url: string;
  destination: string;
}
