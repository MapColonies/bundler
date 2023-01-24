/* eslint-disable @typescript-eslint/naming-convention */ // env variables does not follow convention
import { IParentLogger } from '@bundler/common';

interface EnvDictionary extends NodeJS.Dict<string> {
  DOCKER_BUILDKIT?: string;
}

export interface GlobalOptions {
  verbose?: boolean;
  logger?: IParentLogger;
}

export interface EnvOptions {
  envOptions?: EnvDictionary;
}
