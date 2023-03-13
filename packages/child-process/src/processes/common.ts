/* eslint-disable @typescript-eslint/naming-convention */ // env variables does not follow convention
interface EnvDictionary extends NodeJS.Dict<string> {
  DOCKER_BUILDKIT?: string;
}

export interface EnvOptions {
  envOptions?: EnvDictionary;
}
