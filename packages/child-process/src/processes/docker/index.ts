import { Identifiable, ILogger } from '@bundler/common';
import { spawnChild } from '../../spawner/spawner';
import { EnvOptions, GlobalOptions } from '../common';

const DOCKER_EXEC = 'docker';

enum Command {
  BUILD = 'build',
  SAVE = 'save',
  PULL = 'pull',
  VERSION = 'version',
}

export interface Image extends Identifiable {
  name: string;
  tag: string;
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

export const dockerBuild = async (args: DockerBuildArgs & GlobalOptions): Promise<void> => {
  const { dockerFile, image, path, envOptions, verbose, logger } = args;

  let childLogger: ILogger | undefined = undefined;
  if (verbose === true) {
    childLogger = logger?.child({ image }, { level: 'debug' });
  }

  const childProcess = spawnChild(DOCKER_EXEC, Command.BUILD, ['-f', dockerFile, '-t', `${image.name}:${image.tag}`, path], envOptions, childLogger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.BUILD} failed with exit code ${exitCode}`);
  }
};

export const dockerSave = async (args: DockerSaveArgs & GlobalOptions): Promise<void> => {
  const { image, registry, path, verbose, logger } = args;

  const finalImageName = registry !== undefined ? `${registry}/${image.name}:${image.tag}` : `${image.name}:${image.tag}`;

  let childLogger: ILogger | undefined = undefined;
  if (verbose === true) {
    childLogger = logger?.child({ image }, { level: 'debug' });
  }

  const childProcess = spawnChild(DOCKER_EXEC, Command.SAVE, ['-o', path, finalImageName], undefined, childLogger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.SAVE} failed with exit code ${exitCode}`);
  }
};

export const dockerPull = async (args: DockerPullArgs & GlobalOptions): Promise<void> => {
  const { registry, image, verbose, logger } = args;

  const imageWithRegistry = registry !== undefined ? `${registry}/${image.name}:${image.tag}` : `${image.name}:${image.tag}`;

  let childLogger: ILogger | undefined = undefined;
  if (verbose === true) {
    childLogger = logger?.child({ image }, { level: 'debug' });
  }

  const childProcess = spawnChild(DOCKER_EXEC, Command.PULL, [imageWithRegistry], undefined, childLogger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.PULL} failed with exit code ${exitCode}`);
  }
};

export const dockerVersion = async (args?: GlobalOptions): Promise<void> => {
  const { verbose, logger } = args ?? {};

  let childLogger: ILogger | undefined = undefined;
  if (verbose === true) {
    childLogger = logger?.child({}, { level: 'debug' });
  }

  const childProcess = spawnChild(DOCKER_EXEC, Command.VERSION, [], undefined, childLogger);

  const { exitCode, stderr } = await childProcess;

  if (exitCode !== 0) {
    throw new Error(stderr.length > 0 ? stderr : `docker ${Command.VERSION} failed with exit code ${exitCode}`);
  }
};